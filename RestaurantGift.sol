
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// OpenZeppelinライブラリから、標準的で安全なERC721（NFTの規格）と所有者管理機能をインポートします。
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title RestaurantGift
 * @dev 譲渡不可能なレストランギフトNFTを作成するコントラクトです。
 */
contract RestaurantGift is ERC721, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter; // NFTのIDを自動で連番発行するためのカウンター

    // ギフトの詳細情報を格納する構造体
    struct GiftDetails {
        string restaurantName; // レストラン名
        string courseName;     // コース名
        uint256 price;         // 価格
        uint256 mintTimestamp; // 発行時のタイムスタンプ
        bool isRedeemed;       // 使用済みかどうかのフラグ
    }

    // NFTのIDとギフト詳細情報を紐付けるマッピング
    mapping(uint256 => GiftDetails) public giftDetails;

    // コントラクトがデプロイされた時に、NFTの名前とシンボルを設定します。
    constructor() ERC721("RestaurantGift", "GIFT") {}

    /**
     * @dev トークンを譲渡不可能にするため、標準の`_transfer`関数を上書きします。
     *      発行時（fromアドレスが0）以外は、常にエラーを発生させます。
     */
    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override {
        require(from == address(0), "RestaurantGift: This token is non-transferable");
        super._transfer(from, to, tokenId);
    }

    /**
     * @dev 新しいギフトNFTを発行（ミント）する関数。コントラクトの所有者のみが呼び出せます。
     * @param to 受取人のアドレス
     * @param restaurantName レストラン名
     * @param courseName コース名
     * @param price 価格
     */
    function safeMint(address to, string memory restaurantName, string memory courseName, uint256 price) public onlyOwner {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);

        // NFTのIDに紐づけてギフトの詳細情報を保存
        giftDetails[tokenId] = GiftDetails({
            restaurantName: restaurantName,
            courseName: courseName,
            price: price,
            mintTimestamp: block.timestamp,
            isRedeemed: false
        });
    }

    /**
     * @dev ギフトを利用済みにする関数。NFTの所有者のみが呼び出せます。
     * @param tokenId 利用するギフトNFTのID
     */
    function redeem(uint256 tokenId) public {
        require(_ownerOf(tokenId) == msg.sender, "RestaurantGift: You are not the owner of this gift.");
        require(!giftDetails[tokenId].isRedeemed, "RestaurantGift: This gift has already been redeemed.");

        giftDetails[tokenId].isRedeemed = true;
    }

    // --- 以下はSolidityの要求する標準的なオーバーライド --- //

    function supportsInterface(bytes4 interfaceId) public view override(ERC721) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
