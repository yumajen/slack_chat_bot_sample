"use strict";
/**
 * 現在日時の年月日を取得し、yyyyMMdd形式で返す関数
 */
function todayYmd_() {
    return Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyyMMdd");
}
/**
 * OKを返す関数
 */
function ok_() {
    return ContentService.createTextOutput("ok").setMimeType(ContentService.MimeType.TEXT);
}
