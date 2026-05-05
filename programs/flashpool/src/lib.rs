use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("4UMZ1zCeuyySrY8sxtG6Y5bUvAyMcm5F4JG2aMHw9nV3");

#[program]
pub mod flashpool {
    use super::*;

    pub fn create_pool(
        ctx: Context<CreatePool>,
        reason: String,
        num_contributors: u8,
        amount_per_person: u64,
        deadline: i64,
        mint: Pubkey,
    ) -> Result<()> {
        require!(amount_per_person > 0, FlashpoolError::ZeroAmount);
        require!(num_contributors > 0, FlashpoolError::ZeroContributors);

        // snapshot these before taking any mutable borrows
        let pool_index = ctx.accounts.user_profile.pool_count;
        let creator_key = ctx.accounts.creator.key();
        let pool_bump = ctx.bumps.pool;
        let profile_bump = ctx.bumps.user_profile;

        let pool = &mut ctx.accounts.pool;
        pool.pool_index = pool_index;
        pool.creator = creator_key;
        pool.reason = reason;
        pool.num_contributors = num_contributors;
        pool.amount_per_person = amount_per_person;
        pool.goal = (num_contributors as u64) * amount_per_person;
        pool.current_amount = 0;
        pool.deadline = deadline;
        pool.withdrawn = false;
        pool.mint = mint;
        pool.bump = pool_bump;

        let profile = &mut ctx.accounts.user_profile;
        profile.authority = creator_key;
        profile.bump = profile_bump;
        profile.pool_count += 1;

        Ok(())
    }

    pub fn contribute(ctx: Context<Contribute>) -> Result<()> {
        let pool = &ctx.accounts.pool;
        let clock = Clock::get()?;

        require!(clock.unix_timestamp < pool.deadline, FlashpoolError::DeadlinePassed); // deadline not yet passed
        require!(!pool.withdrawn, FlashpoolError::PoolClosed); // creator hasn't withdrawn yet
        require!(ctx.accounts.mint.key() == pool.mint, FlashpoolError::WrongMint); // only correct USDC mint
        require!(pool.current_amount < pool.goal, FlashpoolError::GoalAlreadyReached); // goal not already reached


        // move USDC from contributor → vault //CPI 
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.contributor_token_account.to_account_info(),
                    to: ctx.accounts.pool_vault.to_account_info(),
                    authority: ctx.accounts.contributor.to_account_info(),
                },
            ),
            pool.amount_per_person,
        )?;

        // update the running total
        ctx.accounts.pool.current_amount += pool.amount_per_person;

        //I fill the empty Contribution account with 4 pieces of data 
        //— who contributed, which pool, how much USDC, and the bump.
        let contribution = &mut ctx.accounts.contribution;
        contribution.pool = ctx.accounts.pool.key();
        contribution.contributor = ctx.accounts.contributor.key();
        contribution.amount = ctx.accounts.pool.amount_per_person;
        contribution.bump = ctx.bumps.contribution;

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        let pool = &ctx.accounts.pool;

        require!(pool.current_amount >= pool.goal, FlashpoolError::GoalNotReached);
        require!(!pool.withdrawn, FlashpoolError::AlreadyWithdrawn);

        let amount = pool.current_amount;

        // pool PDA signs the transfer — seeds must match exactly how the PDA was created
        let creator_key = pool.creator;
        let pool_index_bytes = pool.pool_index.to_le_bytes();
        let bump = pool.bump;
        let signer_seeds: &[&[&[u8]]] = &[&[b"pool", creator_key.as_ref(), &pool_index_bytes, &[bump]]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.pool_vault.to_account_info(),
                    to: ctx.accounts.creator_token_account.to_account_info(),
                    authority: ctx.accounts.pool.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;

        ctx.accounts.pool.withdrawn = true;

        Ok(())
    }

    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        let pool = &ctx.accounts.pool;
        let clock = Clock::get()?;

        require!(clock.unix_timestamp >= pool.deadline, FlashpoolError::DeadlineNotPassed);
        require!(pool.current_amount < pool.goal, FlashpoolError::GoalWasMet);

        let amount = ctx.accounts.contribution.amount;
        let creator_key = pool.creator;
        let pool_index_bytes = pool.pool_index.to_le_bytes();
        let bump = pool.bump;
        let signer_seeds: &[&[&[u8]]] = &[&[b"pool", creator_key.as_ref(), &pool_index_bytes, &[bump]]];

        // move USDC from vault → contributor
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.pool_vault.to_account_info(),
                    to: ctx.accounts.contributor_token_account.to_account_info(),
                    authority: ctx.accounts.pool.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;

        ctx.accounts.pool.current_amount -= amount;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreatePool<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    // one profile per wallet — created on first pool, reused after that
    #[account(
        init_if_needed,
        payer = creator,
        space = 8 + UserProfile::INIT_SPACE,
        seeds = [b"user_profile", creator.key().as_ref()],
        bump,
    )]
    pub user_profile: Account<'info, UserProfile>,

    #[account(
        init,
        payer = creator,
        space = 8 + Pool::INIT_SPACE,
        seeds = [b"pool", creator.key().as_ref(), &user_profile.pool_count.to_le_bytes()],
        bump,
    )]
    pub pool: Account<'info, Pool>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Contribute<'info> {
    #[account(mut)]
    pub contributor: Signer<'info>,

    #[account(
        mut,
        seeds = [b"pool", pool.creator.as_ref(), &pool.pool_index.to_le_bytes()],
        bump = pool.bump,
    )]
    pub pool: Account<'info, Pool>,

    // contributor's USDC token account — where the money comes FROM
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = contributor,
    )]
    pub contributor_token_account: Account<'info, TokenAccount>,

    // pool's vault — where the money goes TO, pool's USDC holding account.
    #[account(
        init_if_needed,
        payer = contributor,
        associated_token::mint = mint,
        associated_token::authority = pool,  //owned by the pool PDA, so only our program controls it.
    )]
    pub pool_vault: Account<'info, TokenAccount>,

    // one record per contributor per pool — created here, read in refund
    #[account(
        init,
        payer = contributor,
        space = 8 + Contribution::INIT_SPACE,
        //this seed means one user → one contribution → in one pool
        seeds = [b"contribution", pool.key().as_ref(), contributor.key().as_ref()],
        bump,
    )]
    pub contribution: Account<'info, Contribution>,

    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [b"pool", creator.key().as_ref(), &pool.pool_index.to_le_bytes()],
        bump = pool.bump,
        has_one = creator,
    )]
    pub pool: Account<'info, Pool>,

    // vault — where the money comes FROM
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = pool,
    )]
    pub pool_vault: Account<'info, TokenAccount>,

    // creator's USDC token account — where the money goes TO
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = creator,
    )]
    pub creator_token_account: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,

    // No system_program — we're not creating any new accounts here, just transferring tokens.
                                                   
}

#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(mut)]
    pub contributor: Signer<'info>,

    #[account(
        mut,
        seeds = [b"pool", pool.creator.as_ref(), &pool.pool_index.to_le_bytes()],
        bump = pool.bump,
    )]
    pub pool: Account<'info, Pool>,

    // vault — where the money comes FROM
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = pool,
    )]
    pub pool_vault: Account<'info, TokenAccount>,

    // contributor's USDC token account — where the money goes TO
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = contributor,
    )]
    pub contributor_token_account: Account<'info, TokenAccount>,

    // their contribution record — read the amount, then close it
    #[account(
        mut,
        seeds = [b"contribution", pool.key().as_ref(), contributor.key().as_ref()],
        bump = contribution.bump,
        has_one = contributor,
        close = contributor,  // closes account + returns rent SOL to contributor
    )]
    pub contribution: Account<'info, Contribution>,

    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

#[account]
#[derive(InitSpace)]           //auto-calculate the total byte size of this struct.
pub struct Pool {
    pub creator: Pubkey,       // who created the pool
    pub pool_index: u64,       // which pool this is for this creator (0, 1, 2...)
    #[max_len(200)]            //max 200 characters
    pub reason: String,        // "trip to Tokyo", "Grandma's hospital bill"...
    pub num_contributors: u8,  // how many people are expected
    pub amount_per_person: u64, // in USDC smallest unit (1 USDC = 1_000_000)
    pub goal: u64,             // = num_contributors * amount_per_person
    pub current_amount: u64,   // how much has been paid so far
    pub deadline: i64,         // unix timestamp
    pub withdrawn: bool,       // has creator already taken the money?
    pub mint: Pubkey,          // USDC mint address — so nobody sneaks in a fake token
    pub bump: u8,              // technical PDA detail — explained next
}


#[account]
#[derive(InitSpace)]
pub struct Contribution {
    pub pool: Pubkey,         // which pool this belongs to
    pub contributor: Pubkey,  // who paid
    pub amount: u64,          // how much they paid (always amount_per_person)
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct UserProfile {
    pub authority: Pubkey,  // the wallet that owns this profile
    pub pool_count: u64,    // how many pools this user has created so far
    pub bump: u8,
}

#[error_code]
pub enum FlashpoolError {
    #[msg("The pool deadline has passed")]
    DeadlinePassed,
    #[msg("The pool has already been withdrawn")]
    PoolClosed,
    #[msg("Wrong token mint — must use the pool's mint")]
    WrongMint,
    #[msg("Goal already reached — no more contributions needed")]
    GoalAlreadyReached,
    #[msg("Amount per person must be greater than zero")]
    ZeroAmount,
    #[msg("Number of contributors must be greater than zero")]
    ZeroContributors,
    #[msg("Goal has not been reached yet")]
    GoalNotReached,
    #[msg("Already withdrawn")]
    AlreadyWithdrawn,
    #[msg("Deadline has not passed yet — refunds not available")]
    DeadlineNotPassed,
    #[msg("Goal was met — refunds not available")]
    GoalWasMet,
}
