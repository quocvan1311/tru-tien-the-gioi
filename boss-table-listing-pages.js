/**
 * Khởi tạo bảng listing dùng chung pattern Excel (initBossTable từ table-app.js).
 * Gọi sau khi load data .js + table-app.js.
 */
(function (global) {
  "use strict";

  var SEASON_ORDER_THIEN_AM = [
    "Đạo Khởi Thanh Vân",
    "Cô Tâm Hám Hải",
    "Thiện Âm Phá Hiểu",
  ];

  var AC_MONG_STYLE_SEARCH_KEYS = [
    "Tên season",
    "Tên BOSS (Ác mộng)",
    "Tên phụ bản",
  ];

  function baseAcMongStyleListing() {
    return {
      searchKeys: AC_MONG_STYLE_SEARCH_KEYS.slice(),
      tableExtraClass: "excel-ac-mong",
      skipBlankRows: true,
      seasonKey: "Tên season",
      statusLocale: "vi",
      seasonSummaryOrder: SEASON_ORDER_THIEN_AM.slice(),
    };
  }

  function initAcMong10ListingTable() {
    var cols = [
      "No.",
      "Index",
      "Tên season",
      "Tên phụ bản",
      "Ảnh",
      "Tên BOSS (Ác mộng)",
      "Độ khó",
      "Ngày ra mắt",
      "Ngày tiêu diệt",
      "Tuần tiêu diệt",
      "Số ngày",
      "Kỹ năng",
      "Ghi chú",
    ];
    var w = {
      "No.": "2.5%",
      Index: "3.25%",
      "Tên season": "10%",
      "Ngày ra mắt": "6%",
      "Ngày tiêu diệt": "6%",
      "Tuần tiêu diệt": "5%",
      "Số ngày": "3%",
      "Tên BOSS (Ác mộng)": "11.83%",
      "Tên phụ bản": "12.87%",
      "Kỹ năng": "14.09%",
      "Độ khó": "4.85%",
      "Ghi chú": "11.75%",
      Ảnh: "8.9%",
    };
    global.initBossTable(
      Object.assign({}, baseAcMongStyleListing(), {
        data: global.AC_MONG_10_TABLE_DATA,
        title: "Ác mộng 10",
        columns: cols,
        columnWidths: w,
        detailPage: "ac-mong-detail.html",
        columnDisplay: {
          "No.": { noWrap: true },
          Index: { noWrap: true },
          "Ngày ra mắt": { type: "date", noWrap: true },
          "Ngày tiêu diệt": { type: "date", noWrap: true },
          "Số ngày": { noWrap: true },
          "Độ khó": { noWrap: true },
          "Kỹ năng": { preWrap: true },
          "Tên BOSS (Ác mộng)": { preWrap: true, bossExcel: true },
          "Ghi chú": { preWrap: true },
          Ảnh: { type: "images" },
        },
        cellBgMode: "ac-mong",
      }),
    );
  }

  function initLuyenNguc10ListingTable() {
    var cols = [
      "No.",
      "Index",
      "Tên season",
      "Tên phụ bản",
      "Ảnh",
      "Tên BOSS (Ác mộng)",
      "Độ khó",
      "Ngày ra mắt",
      "Ngày tiêu diệt",
      "Tuần tiêu diệt",
      "Số ngày",
      "Ghi chú",
    ];
    var w = {
      "No.": "2.5%",
      Index: "3.5%",
      "Tên season": "10%",
      "Ngày ra mắt": "6%",
      "Ngày tiêu diệt": "6%",
      "Tuần tiêu diệt": "6%",
      "Số ngày": "4%",
      "Tên BOSS (Ác mộng)": "15.8%",
      "Tên phụ bản": "13.6%",
      "Độ khó": "5%",
      "Ghi chú": "11.6%",
      Ảnh: "16%",
    };
    global.initBossTable(
      Object.assign({}, baseAcMongStyleListing(), {
        data: global.LUYEN_NGUC_10_TABLE_DATA,
        title: "Luyện ngục 10",
        columns: cols,
        columnWidths: w,
        detailPage: "luyen-nguc-detail.html",
        columnDisplay: {
          "No.": { noWrap: true },
          Index: { noWrap: true },
          "Ngày ra mắt": { type: "date", noWrap: true },
          "Ngày tiêu diệt": { type: "date", noWrap: true },
          "Số ngày": { noWrap: true },
          "Độ khó": { noWrap: true },
          "Tên BOSS (Ác mộng)": { preWrap: true, bossExcel: true },
          "Tên phụ bản": { preWrap: true },
          "Ghi chú": { preWrap: true },
          Ảnh: { type: "images" },
        },
        cellBgMode: "luyen-nguc",
      }),
    );
  }

  function initPhuBan5ListingTable() {
    var cols = ["No.", "Mùa", "Tên phụ bản", "Boss 1", "Boss 2", "Boss 3"];
    var w = {
      "No.": "2%",
      Mùa: "3%",
      "Tên phụ bản": "16%",
      "Boss 1": "26%",
      "Boss 2": "26%",
      "Boss 3": "26%",
    };
    global.initBossTable({
      data: global.PHU_BAN_5_TABLE_DATA,
      title: "Phụ bản 5",
      columns: cols,
      columnWidths: w,
      searchKeys: ["Mùa", "Tên phụ bản", "Boss 1", "Boss 2", "Boss 3"],
      seasonChipPrefix: "Mùa",
      detailPage: "phu-ban-5-detail.html",
      detailRowId: global.BOSS_TABLE_PHU_BAN_DETAIL_ROW_ID,
      columnDisplay: {
        "No.": { noWrap: true },
        Mùa: { noWrap: true },
        "Tên phụ bản": { preWrap: true },
        "Boss 1": { type: "bossWithImage" },
        "Boss 2": { type: "bossWithImage" },
        "Boss 3": { type: "bossWithImage" },
      },
      tableExtraClass: "excel-ac-mong excel-phu-ban",
      skipBlankRows: true,
      seasonKey: "Mùa",
      statusLocale: "vi",
      cellBgMode: "phu-ban",
    });
  }

  /**
   * @param {"ac-mong-10"|"luyen-nguc-10"|"phu-ban-5"} kind
   */
  global.initBossExcelListingPage = function (kind) {
    if (typeof global.initBossTable !== "function") {
      var st = document.getElementById("status");
      if (st) {
        st.textContent = "Missing table-app.js.";
      }
      return;
    }
    if (kind === "ac-mong-10") {
      initAcMong10ListingTable();
    } else if (kind === "luyen-nguc-10") {
      initLuyenNguc10ListingTable();
    } else if (kind === "phu-ban-5") {
      initPhuBan5ListingTable();
    }
  };
})(typeof window !== "undefined" ? window : this);
