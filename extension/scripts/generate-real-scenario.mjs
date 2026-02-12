import fs from 'node:fs'
import path from 'node:path'
import XLSX from 'xlsx'

const extensionDir = process.cwd()
const projectRoot = path.resolve(extensionDir, '..')
const outDir = path.join(projectRoot, 'test-data', 'scenario_ecom_ops')
fs.mkdirSync(outDir, { recursive: true })

const writeAoa = (fileName, sheetName, aoa) => {
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  const filePath = path.join(outDir, fileName)
  XLSX.writeFile(wb, filePath)
  return filePath
}

const writeJson = (fileName, sheetName, rows) => {
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  const filePath = path.join(outDir, fileName)
  XLSX.writeFile(wb, filePath)
  return filePath
}

const customersCrmTitleRows = [
  ['CRM Contacts Export'],
  ['Generated At', '2026-02-05 10:12:00'],
  ['Owner', 'Ops Team'],
  [],
  ['客户编号', '姓名', '手机号', '邮箱', '城市', '最近下单时间'],
  ['C001', '陈晓', '13800138000', 'alice@example.com', '上海', '2026-01-20'],
  ['C002', '李博', '13800138001', 'bob@example.com', '北京', '2026-01-12'],
  ['C003', '王珂', '13800138002', 'carol@example.com', '深圳', '2026-01-05'],
  ['C004', '张蕾', '13800138003', 'dora@example.com', '杭州', '2026-01-28'],
  ['C005', '赵峰', '13800138004', 'eric@example.com', '广州', '2026-02-01'],
]

const shopOrders = [
  { 'Order No': 'O-2026-1001', 'Customer ID': 'C001', Email: 'alice@example.com', Phone: '13800138000', 'Paid Amount': 199.9, Currency: 'CNY', 'Created At': '2026-01-10', Status: 'Paid', Province: '上海', City: '上海' },
  { 'Order No': 'O-2026-1002', 'Customer ID': 'C002', Email: 'bob@example.com', Phone: '13800138001', 'Paid Amount': 88.0, Currency: 'CNY', 'Created At': '2026-01-12', Status: 'Paid', Province: '北京', City: '北京' },
  { 'Order No': 'O-2026-1003', 'Customer ID': 'C001', Email: 'alice@example.com', Phone: '13800138000', 'Paid Amount': 42.5, Currency: 'CNY', 'Created At': '2026-01-20', Status: 'Paid', Province: '上海', City: '上海' },
  { 'Order No': 'O-2026-1004', 'Customer ID': 'C004', Email: 'dora@example.com', Phone: '13800138003', 'Paid Amount': 329.0, Currency: 'CNY', 'Created At': '2026-01-28', Status: 'Paid', Province: '浙江', City: '杭州' },
  { 'Order No': 'O-2026-1005', 'Customer ID': 'C005', Email: 'eric@example.com', Phone: '13800138004', 'Paid Amount': 15.9, Currency: 'CNY', 'Created At': '2026-02-01', Status: 'Refunded', Province: '广东', City: '广州' },
]

const supportTickets = [
  { 'Ticket ID': 'T-9001', customer_id: 'C001', 'Customer Email': 'alice@example.com', 渠道: '微信', 问题类型: '退款咨询', 'Created Time': '2026-02-02', 处理状态: 'Open' },
  { 'Ticket ID': 'T-9002', customer_id: 'C003', 'Customer Email': 'carol@example.com', 渠道: '邮件', 问题类型: '发票抬头修改', 'Created Time': '2026-02-03', 处理状态: 'Solved' },
  { 'Ticket ID': 'T-9003', customer_id: 'C005', 'Customer Email': 'eric@example.com', 渠道: '电话', 问题类型: '物流催促', 'Created Time': '2026-02-04', 处理状态: 'Pending' },
]

const payoutsTitleRows = [
  ['Payment Provider Payout Report'],
  ['Period', '2026-01-01 ~ 2026-02-04'],
  [],
  ['Transaction Id', 'Order Number', 'CustomerId', 'Amount', 'Fee', 'Net', 'Paid Time', 'Channel'],
  ['TX-7001', 'O-2026-1001', 'C001', 199.9, 3.2, 196.7, '2026-01-10 12:10', 'Alipay'],
  ['TX-7002', 'O-2026-1002', 'C002', 88.0, 1.5, 86.5, '2026-01-12 09:30', 'WeChatPay'],
  ['TX-7003', 'O-2026-1004', 'C004', 329.0, 5.3, 323.7, '2026-01-28 18:42', 'Alipay'],
  ['TX-7004', 'O-2026-1005', 'C005', 15.9, 0.3, 15.6, '2026-02-01 10:05', 'WeChatPay'],
]

const outputs = [
  writeAoa('01_crm_contacts.xlsx', 'Contacts', customersCrmTitleRows),
  writeJson('02_shop_orders_export.xlsx', 'Orders', shopOrders),
  writeJson('03_support_tickets.xlsx', 'Tickets', supportTickets),
  writeAoa('04_payouts_report.xlsx', 'Payouts', payoutsTitleRows),
]

const readBackCount = (filePath) => {
  const buf = fs.readFileSync(filePath)
  const wb = XLSX.read(buf, { type: 'buffer' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
  return rows.length
}

const summary = outputs.map((p) => ({ file: path.basename(p), rows: readBackCount(p) }))
process.stdout.write(JSON.stringify({ outDir, files: summary }, null, 2) + '\n')
