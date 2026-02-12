import fs from 'node:fs'
import path from 'node:path'
import XLSX from 'xlsx'

const extensionDir = process.cwd()
const projectRoot = path.resolve(extensionDir, '..')
const outDir = path.join(projectRoot, 'test-data', 'complex_test_cases')
fs.mkdirSync(outDir, { recursive: true })

const writeAoa = (fileName, sheetName, aoa) => {
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  const filePath = path.join(outDir, fileName)
  XLSX.writeFile(wb, filePath)
  return filePath
}

// 1. 财务报表：带干扰行，英文表头
const financialData = [
  ['Global Payment Report - Confidential'],
  ['Report Date:', '2026-02-10'],
  ['Exported By:', 'Admin_01'],
  [], // 空行
  ['Transaction_ID', 'Order_Ref', 'Amount_Gross', 'Fee', 'Net_Settlement', 'Status'],
  ['TX99001', 'ORD-2026-001', 299.00, 4.5, 294.5, 'Settled'],
  ['TX99002', 'ORD-2026-002', 150.50, 2.2, 148.3, 'Settled'],
  ['TX99003', 'ORD-2026-003', 45.00, 0.8, 44.2, 'Pending'],
  ['TX99004', 'ORD-2026-005', 888.00, 12.0, 876.0, 'Settled'],
]

// 2. ERP 订单：中文表头，日期格式不一，包含手机号
const erpData = [
  ['订单编号', '下单时间', '支付金额', '客户手机', '省份'],
  ['ORD-2026-001', '2026/01/05', 299.0, '138-0013-8000', '上海'],
  ['ORD-2026-002', '2026-01-06', 150.5, '138 0013 8001', '北京'],
  ['ORD-2026-003', '07-Jan-2026', 45.0, '+8613800138002', '广东'],
  ['ORD-2026-004', '2026.01.08', 120.0, '13800138003', '浙江'],
  ['ORD-2026-005', '2026-01-10', 888.0, '13800138004', '江苏'],
]

// 3. 售后登记：只有手机号和问题，缺少订单关联
const afterSalesData = [
  ['Phone_Number', 'Issue_Type', 'Notes'],
  ['13800138000', '退货', '尺码不合适'],
  ['13800138002', '质量问题', '线头较多'],
  ['18812345678', '物流咨询', '查不到单号'], // 这是一个不在 ERP 里的新用户
]

const outputs = [
  writeAoa('01_financial_payouts.xlsx', 'Settlements', financialData),
  writeAoa('02_erp_orders.xlsx', 'Orders', erpData),
  writeAoa('03_after_sales_logs.xlsx', 'Issues', afterSalesData),
]

console.log(`Complex test cases generated in: ${outDir}`)
