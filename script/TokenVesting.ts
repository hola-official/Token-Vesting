import { time } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";

async function main() {

  const myAccount = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
  const beneficiary = "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc";
    const signer = await ethers.getSigner(myAccount);

    const DEPLOYED_ERC20_CONTRACT =
      "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const DEPLOYED_TOKENVEST_CONTRACT =
      "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

    const ONE_MINUTE = 60;
    const TWO_MINUTES = 120;
    const VESTING_AMOUNT = ethers.parseUnits("100", 18);
    const INITIAL_MINT = ethers.parseUnits("1000", 18);

    // Get contract instances
    console.log("Getting contract instances...");
    const erc20Token = await ethers.getContractAt(
      "ERC20Token",
      DEPLOYED_ERC20_CONTRACT
    );
    const tokenVesting = await ethers.getContractAt(
      "TokenVesting",
      DEPLOYED_TOKENVEST_CONTRACT
    );

    // Verify the token address in vesting contract
    // const tokenAddress = await tokenVesting.token();
    // console.log("Token address in vesting contract:", tokenAddress);
    // console.log("Expected token address:", DEPLOYED_ERC20_CONTRACT);

    // if (tokenAddress.toLowerCase() !== DEPLOYED_ERC20_CONTRACT.toLowerCase()) {
    //   throw new Error("Token address mismatch in vesting contract");
    // }

    console.log("\n#### Minting tokens to Vesting Contract ####");
    const mintTx = await erc20Token
      .connect(signer)
      .mint(DEPLOYED_TOKENVEST_CONTRACT, INITIAL_MINT);
    await mintTx.wait();

    const vestingBalance = await erc20Token.balanceOf(
      DEPLOYED_TOKENVEST_CONTRACT
    );
    console.log(
      "Vesting contract balance:",
      ethers.formatUnits(vestingBalance, 18)
    );

    if (vestingBalance < VESTING_AMOUNT) {
      throw new Error("Insufficient tokens in vesting contract");
    }

    console.log("\n#### Adding Beneficiary ####");
    const currentTime = await time.latest();
    const vestingStart = currentTime + ONE_MINUTE;

    const addBeneficiaryTx = await tokenVesting.addBeneficiary(
      beneficiary,
      ONE_MINUTE,
      TWO_MINUTES,
      VESTING_AMOUNT
    );
    await addBeneficiaryTx.wait(); // Wait for confirmation

    console.log("Beneficiary added with vesting schedule:");
    console.log("- Start time:", vestingStart);
    console.log("- Duration:", TWO_MINUTES, "seconds");
    console.log("- Total amount:", ethers.formatUnits(VESTING_AMOUNT, 18));

    // Initial check
    console.log("\n#### Initial Check ####");
    let releasableAmount = await tokenVesting.getReleasableAmount(beneficiary);
    console.log(
      "Initial releasable amount:",
      ethers.formatUnits(releasableAmount, 18)
    );

    // Advance time
    console.log("\n#### Advancing Time to Middle of Vesting Period ####");
    await time.increaseTo(vestingStart + ONE_MINUTE);
    const midwayTimestamp = await time.latest();
    console.log("Current timestamp:", midwayTimestamp);

    // Check releasable amount before claiming
    releasableAmount = await tokenVesting.getReleasableAmount(beneficiary);
    console.log(
      "Releasable amount at halfway point:",
      ethers.formatUnits(releasableAmount, 18)
    );

    if (releasableAmount.toString() === "0") {
      console.log("No tokens available to claim at halfway point");
    } else {
      console.log("\n#### Claiming Tokens ####");
      const initialBalance = await erc20Token.balanceOf(beneficiary);
      console.log(
        "Initial beneficiary balance:",
        ethers.formatUnits(initialBalance, 18)
      );

      const claimTx = await tokenVesting.connect(signer).claimTokens();
      await claimTx.wait(); // Wait for confirmation

      const newBalance = await erc20Token.balanceOf(beneficiary);
      console.log(
        "New beneficiary balance:",
        ethers.formatUnits(newBalance, 18)
      );
      console.log(
        "Claimed amount:",
        ethers.formatUnits(newBalance - initialBalance, 18)
      );
    }

    // Advance to end
    console.log("\n#### Advancing Time to End of Vesting Period ####");
    await time.increaseTo(vestingStart + TWO_MINUTES);
    console.log("Current timestamp:", await time.latest());

    releasableAmount = await tokenVesting.getReleasableAmount(signer);
    console.log(
      "Final releasable amount:",
      ethers.formatUnits(releasableAmount, 18)
    );

  if (releasableAmount.toString() === "0") {
    console.log("No tokens available to claim at end");
  } else {
    console.log("\n#### Claiming Remaining Tokens ####");
    const balanceBeforeFinal = await erc20Token.balanceOf(signer);

    const finalClaimTx = await tokenVesting.connect(signer).claimTokens();
    await finalClaimTx.wait(); // Wait for confirmation

    const finalBalance = await erc20Token.balanceOf(signer);
    console.log(
      "Final beneficiary balance:",
      ethers.formatUnits(finalBalance, 18)
    );
    console.log(
      "Final claim amount:",
      ethers.formatUnits(finalBalance - balanceBeforeFinal, 18)
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
