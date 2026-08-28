const rawText = `[Gemini Vision] {"weekStart":"2026-07-06","weekEnd":"2026-07-12","totalOrders":15,"customers":null,"grossSales":348.19,"earnings":92.28,"marketing":152,"offersOnItems":null,"offerRedemptionFee":null,"adSpends":152,"adCredits":null,"commission":45.98,"uberFees":15.28,"marketplaceFee":null,"vatRoundingAdj":null,"refunds":0,"netOrderErrorAdjustments":null,"otherPayments":null,"netPaid":92.28}`;

const geminiJsonStr = rawText.replace("[Gemini Vision]", "").trim();
let geminiData = JSON.parse(geminiJsonStr);

const ocrData = {
  grossSales: geminiData.grossSales ?? geminiData.earnings ?? 0,
};

console.log(ocrData);
