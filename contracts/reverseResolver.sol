// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "./reversedRegistrar.sol";
import "hardhat/console.sol";

contract DefaultReverseResolver is NameResolver {
    // namehash('addr.reverse')
    bytes32 constant ADDR_REVERSE_NODE =
        0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2;

    ENS public ens;
    mapping(bytes32 => string) private _name;

    /**
     * @dev Only permits calls by the reverse registrar.
     * @param node The node permission is required for.
     */
    modifier onlyOwner(bytes32 node) {
        console.log(
            "reverseresolver (onlyOwner (sender, owner) )",
            msg.sender,
            ens.owner(node)
        );
        require(msg.sender == ens.owner(node));
        _;
    }

    function toHex16(bytes16 data) internal pure returns (bytes32 result) {
        result =
            (bytes32(data) &
                0xFFFFFFFFFFFFFFFF000000000000000000000000000000000000000000000000) |
            ((bytes32(data) &
                0x0000000000000000FFFFFFFFFFFFFFFF00000000000000000000000000000000) >>
                64);
        result =
            (result &
                0xFFFFFFFF000000000000000000000000FFFFFFFF000000000000000000000000) |
            ((result &
                0x00000000FFFFFFFF000000000000000000000000FFFFFFFF0000000000000000) >>
                32);
        result =
            (result &
                0xFFFF000000000000FFFF000000000000FFFF000000000000FFFF000000000000) |
            ((result &
                0x0000FFFF000000000000FFFF000000000000FFFF000000000000FFFF00000000) >>
                16);
        result =
            (result &
                0xFF000000FF000000FF000000FF000000FF000000FF000000FF000000FF000000) |
            ((result &
                0x00FF000000FF000000FF000000FF000000FF000000FF000000FF000000FF0000) >>
                8);
        result =
            ((result &
                0xF000F000F000F000F000F000F000F000F000F000F000F000F000F000F000F000) >>
                4) |
            ((result &
                0x0F000F000F000F000F000F000F000F000F000F000F000F000F000F000F000F00) >>
                8);
        result = bytes32(
            0x3030303030303030303030303030303030303030303030303030303030303030 +
                uint256(result) +
                (((uint256(result) +
                    0x0606060606060606060606060606060606060606060606060606060606060606) >>
                    4) &
                    0x0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F) *
                7
        );
    }

    function toHex(bytes32 data) public pure returns (string memory) {
        return
            string(
                abi.encodePacked(
                    "0x",
                    toHex16(bytes16(data)),
                    toHex16(bytes16(data << 128))
                )
            );
    }

    /**
     * @dev Constructor
     * @param ensAddr The address of the ENS registry.
     */
    constructor(ENS ensAddr) {
        ens = ensAddr;

        // Assign ownership of the reverse record to our deployer
        ReverseTestRegistrar registrar = ReverseTestRegistrar(
            ens.owner(ADDR_REVERSE_NODE)
        );
        if (address(registrar) != address(0x0)) {
            registrar.claim(msg.sender);
        }
    }

    /**
     * @dev Sets the name for a node.
     * @param node The node to update.
     * @param domain The name to set.
     */
    function setName(bytes32 node, string memory domain) public override {
        _name[node] = domain;
        console.log("Reverse Resolver (setName)", domain, toHex(node));
    }

    function name(bytes32 node) external view virtual returns (string memory) {
        console.log("Reverse Resolver (name)", toHex(node));
        return "mydomain.test";
    }
}
