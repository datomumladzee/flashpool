import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Flashpool } from "../target/types/flashpool";
import {
  createMint,
  createAssociatedTokenAccount,
  mintTo,
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

    // Derive the pool PDA — same seeds as the program
    const [poolPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), creator.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .createPool(
        "Trip to Tokyo",
        2,                              // num_contributors
        new anchor.BN(1_000_000),       // amount_per_person: 1 USDC
        new anchor.BN(deadline),
        mint
      )
      .accounts({
        creator: creator.publicKey,
        pool: poolPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    // Read the on-chain pool account and check every field
    const pool = await program.account.pool.fetch(poolPda);

    assert.equal(pool.creator.toBase58(), creator.publicKey.toBase58());
    assert.equal(pool.reason, "Trip to Tokyo");
    assert.equal(pool.numContributors, 2);
    assert.ok(pool.amountPerPerson.eq(new anchor.BN(1_000_000)));
    assert.ok(pool.goal.eq(new anchor.BN(2_000_000))); // 2 × 1 USDC
    assert.ok(pool.currentAmount.eq(new anchor.BN(0)));
    assert.equal(pool.withdrawn, false);
    assert.equal(pool.mint.toBase58(), mint.toBase58());
  });
});
