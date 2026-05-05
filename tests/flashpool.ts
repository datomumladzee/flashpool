import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Flashpool } from "../target/types/flashpool";
import {
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { assert } from "chai";

describe("flashpool", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Flashpool as Program<Flashpool>;
  const connection = provider.connection;

  // Keypairs
  //Then we create three participants — a creator, who will create the pool, and two contributors, 
  // who will take part. At this point, they only have addresses with empty wallets.

  const creator = anchor.web3.Keypair.generate();
  const contributor1 = anchor.web3.Keypair.generate();
  const contributor2 = anchor.web3.Keypair.generate();

  // Token accounts (filled in `before`)
  let mint: anchor.web3.PublicKey;
  let creatorTokenAccount: anchor.web3.PublicKey;
  let contributor1TokenAccount: anchor.web3.PublicKey;
  let contributor2TokenAccount: anchor.web3.PublicKey;

  before(async () => {
    // Give everyone some SOL to pay for transactions
    await Promise.all([
      connection.requestAirdrop(creator.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL),
      connection.requestAirdrop(contributor1.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL),
      connection.requestAirdrop(contributor2.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL),
    ]).then((sigs) => Promise.all(sigs.map((sig) => connection.confirmTransaction(sig))));

    // Create a fake USDC mint (6 decimals, creator is the mint authority)
    mint = await createMint(connection, creator, creator.publicKey, null, 6);

    // Create a token account for each person ATA
    creatorTokenAccount = await createAssociatedTokenAccount(connection, creator, mint, creator.publicKey);
    contributor1TokenAccount = await createAssociatedTokenAccount(connection, contributor1, mint, contributor1.publicKey);
    contributor2TokenAccount = await createAssociatedTokenAccount(connection, contributor2, mint, contributor2.publicKey);

    // Mint 10 USDC (10_000_000 base units) to each contributor
    await mintTo(connection, creator, mint, contributor1TokenAccount, creator, 10_000_000);
    await mintTo(connection, creator, mint, contributor2TokenAccount, creator, 10_000_000);
  });

  it("creates a pool", async () => {
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    // one profile per creator — no index in the seed
    const [userProfilePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user_profile"), creator.publicKey.toBuffer()],
      program.programId
    );

    // first pool → pool_count is 0, encode as 8-byte little-endian
    const poolCountBytes = new anchor.BN(0).toArrayLike(Buffer, "le", 8);
    const [poolPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), creator.publicKey.toBuffer(), poolCountBytes],
      program.programId
    );

    await program.methods
      .createPool(
        "Trip to Tokyo",
        2,                        // num_contributors
        new anchor.BN(1_000_000), // amount_per_person: 1 USDC
        new anchor.BN(deadline),
        mint
      )
      .accounts({
        creator: creator.publicKey,
        userProfile: userProfilePda,
        pool: poolPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    const pool = await program.account.pool.fetch(poolPda);

    assert.equal(pool.creator.toBase58(), creator.publicKey.toBase58());
    assert.ok(pool.poolIndex.eq(new anchor.BN(0)));     // first pool = index 0
    assert.equal(pool.reason, "Trip to Tokyo");
    assert.equal(pool.numContributors, 2);
    assert.ok(pool.amountPerPerson.eq(new anchor.BN(1_000_000)));
    assert.ok(pool.goal.eq(new anchor.BN(2_000_000)));  // 2 × 1 USDC
    assert.ok(pool.currentAmount.eq(new anchor.BN(0)));
    assert.equal(pool.withdrawn, false);
    assert.equal(pool.mint.toBase58(), mint.toBase58());

    // counter must have incremented to 1
    const profile = await program.account.userProfile.fetch(userProfilePda);
    assert.ok(profile.poolCount.eq(new anchor.BN(1)));
  });

  it("contributes to a pool", async () => {
    const poolCountBytes = new anchor.BN(0).toArrayLike(Buffer, "le", 8);
    const [poolPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), creator.publicKey.toBuffer(), poolCountBytes],
      program.programId
    );

    // one contribution record per contributor per pool
    const [contributionPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("contribution"), poolPda.toBuffer(), contributor1.publicKey.toBuffer()],
      program.programId
    );

    // vault = ATA owned by the pool PDA (true = allow off-curve owner)
    const poolVault = await getAssociatedTokenAddress(mint, poolPda, true);

    await program.methods
      .contribute()
      .accounts({
        contributor: contributor1.publicKey,
        pool: poolPda,
        contributorTokenAccount: contributor1TokenAccount,
        poolVault: poolVault,
        contribution: contributionPda,
        mint: mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([contributor1])
      .rpc();

    // pool running total updated
    const pool = await program.account.pool.fetch(poolPda);
    assert.ok(pool.currentAmount.eq(new anchor.BN(1_000_000)));

    // vault holds exactly 1 USDC
    const vaultBalance = await connection.getTokenAccountBalance(poolVault);
    assert.equal(vaultBalance.value.amount, "1000000");

    // contribution record has correct fields
    const contribution = await program.account.contribution.fetch(contributionPda);
    assert.equal(contribution.contributor.toBase58(), contributor1.publicKey.toBase58());
    assert.equal(contribution.pool.toBase58(), poolPda.toBase58());
    assert.ok(contribution.amount.eq(new anchor.BN(1_000_000)));
  });

  it("second contributor fills the pool", async () => {
    const poolCountBytes = new anchor.BN(0).toArrayLike(Buffer, "le", 8);
    const [poolPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), creator.publicKey.toBuffer(), poolCountBytes],
      program.programId
    );

    const [contributionPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("contribution"), poolPda.toBuffer(), contributor2.publicKey.toBuffer()],
      program.programId
    );

    const poolVault = await getAssociatedTokenAddress(mint, poolPda, true);

    await program.methods
      .contribute()
      .accounts({
        contributor: contributor2.publicKey,
        pool: poolPda,
        contributorTokenAccount: contributor2TokenAccount,
        poolVault: poolVault,
        contribution: contributionPda,
        mint: mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([contributor2])
      .rpc();

    // goal is now fully reached
    const pool = await program.account.pool.fetch(poolPda);
    assert.ok(pool.currentAmount.eq(new anchor.BN(2_000_000)));
    assert.ok(pool.currentAmount.eq(pool.goal));

    // vault holds 2 USDC
    const vaultBalance = await connection.getTokenAccountBalance(poolVault);
    assert.equal(vaultBalance.value.amount, "2000000");
  });

  it("creator withdraws", async () => {
    const poolCountBytes = new anchor.BN(0).toArrayLike(Buffer, "le", 8);
    const [poolPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), creator.publicKey.toBuffer(), poolCountBytes],
      program.programId
    );

    const poolVault = await getAssociatedTokenAddress(mint, poolPda, true);

    await program.methods
      .withdraw()
      .accounts({
        creator: creator.publicKey,
        pool: poolPda,
        poolVault: poolVault,
        creatorTokenAccount: creatorTokenAccount,
        mint: mint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([creator])
      .rpc();

    // pool is marked as withdrawn
    const pool = await program.account.pool.fetch(poolPda);
    assert.equal(pool.withdrawn, true);

    // creator received both contributions (2 USDC)
    const creatorBalance = await connection.getTokenAccountBalance(creatorTokenAccount);
    assert.equal(creatorBalance.value.amount, "2000000");

    // vault is empty
    const vaultBalance = await connection.getTokenAccountBalance(poolVault);
    assert.equal(vaultBalance.value.amount, "0");
  });

  it("refunds after deadline", async () => {
    const [userProfilePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user_profile"), creator.publicKey.toBuffer()],
      program.programId
    );

    // second pool — profile counter is now 1 after the first pool
    const poolCountBytes = new anchor.BN(1).toArrayLike(Buffer, "le", 8);
    const [poolPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), creator.publicKey.toBuffer(), poolCountBytes],
      program.programId
    );

    // deadline 3 seconds from now — will expire during this test
    const deadline = Math.floor(Date.now() / 1000) + 3;

    await program.methods
      .createPool("Refund test", 2, new anchor.BN(1_000_000), new anchor.BN(deadline), mint)
      .accounts({
        creator: creator.publicKey,
        userProfile: userProfilePda,
        pool: poolPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    // only contributor1 pays — goal won't be met (needs 2 contributors)
    const [contributionPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("contribution"), poolPda.toBuffer(), contributor1.publicKey.toBuffer()],
      program.programId
    );
    const poolVault = await getAssociatedTokenAddress(mint, poolPda, true);

    await program.methods
      .contribute()
      .accounts({
        contributor: contributor1.publicKey,
        pool: poolPda,
        contributorTokenAccount: contributor1TokenAccount,
        poolVault: poolVault,
        contribution: contributionPda,
        mint: mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([contributor1])
      .rpc();

    // wait for the deadline to pass
    await new Promise((resolve) => setTimeout(resolve, 4000));

    const balanceBefore = await connection.getTokenAccountBalance(contributor1TokenAccount);

    await program.methods
      .refund()
      .accounts({
        contributor: contributor1.publicKey,
        pool: poolPda,
        poolVault: poolVault,
        contributorTokenAccount: contributor1TokenAccount,
        contribution: contributionPda,
        mint: mint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([contributor1])
      .rpc();

    // contributor1 gets their 1 USDC back
    const balanceAfter = await connection.getTokenAccountBalance(contributor1TokenAccount);
    assert.equal(
      Number(balanceAfter.value.amount) - Number(balanceBefore.value.amount),
      1_000_000
    );

    // vault is drained
    const vaultBalance2 = await connection.getTokenAccountBalance(poolVault);
    assert.equal(vaultBalance2.value.amount, "0");
  });
});
