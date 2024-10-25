import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";


const TokenVestingModule = buildModule("TokenVestingModule", (m) => {
  const ERC20 = "0xd8Fc2D107010Db709B80a563AdA7744f7c14308a";
  const token = m.getParameter("token", ERC20);
  const TokenVesting = m.contract("TokenVesting", [token]);

  return { TokenVesting };
});

export default TokenVestingModule;
