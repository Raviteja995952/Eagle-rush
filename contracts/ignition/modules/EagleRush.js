const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("EagleRushModule", (m) => {
  const eagleRush = m.contract("EagleRush");
  return { eagleRush };
});
