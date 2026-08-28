---
description: Critical rules and learned behaviors for the Hungry Birds system
---

# HUNGRY BIRDS SYSTEM RULES

## 1. Batch Uploading for Sales Invoices
When uploading multiple sales invoices (Platform or POS) at once, they MUST be uploaded as separate, individual POST requests to the `/api/invoices` endpoint. Do NOT merge them into a single PDF (like we do for supplier invoices). This ensures the OCR system can accurately extract data for each separate week/platform.

## 2. Platform OCR Math Strictness
The OCR system must perfectly balance Deliveroo, Just Eat, and Uber Eats. 
- **Just Eat**: `(Gross Sales - Commission - Ad Spends - Cash Orders - Other Fees) = Net Paid`. You MUST bundle Admin Fee and all other unlisted deductions into `otherFees`, and **net them against any Rebates or Credits** (e.g. £50 deduction - £10 rebate = £40 `otherFees`) to make this equation balance perfectly. Top Rank and Promoted placement strictly go into `adSpends`. Ensure `totalOrders` is extracted.
- **Deliveroo**: `(Gross Sales - Commission - Ad Spends - Top Rank - Other Fees + Other Payments) = Net Paid`. The AI MUST bundle any unlisted/remaining "Additional Fees" into `otherFees` to ensure this equation perfectly balances to the penny.
- **Uber Eats**: Ensure `adSpends` (Sponsored Listings/Marketing) and `topRankFee` (Top Rank) are explicitly extracted before calculating `otherFees`.

## 3. Platform Performance UI Calculation
In `HungryBirdsDashboard.tsx`, the `Deductions` column in the Platform Performance table must ALWAYS be calculated as `Gross Sales - Net Paid`. Do NOT hardcode it to just `Commission`, as this will hide Ad Spends, Top Rank Fees, and other valid deductions from the user's view.

## 4. Profit Summary Breakdown
The "Profit Summary" must clearly break down Platform Fees into 3 separate sections:
- Commission
- Ad Spends & Promoted
- Other Deductions
Each section must list the breakdown by individual platform underneath it.
