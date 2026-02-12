import fs from 'node:fs'
import path from 'node:path'
import XLSX from 'xlsx'

const projectRoot = path.resolve(process.cwd(), '..')
const outDir = path.join(projectRoot, 'test-data')
fs.mkdirSync(outDir, { recursive: true })

const writeXlsx = (fileName, sheetName, rows) => {
  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  const filePath = path.join(outDir, fileName)
  XLSX.writeFile(workbook, filePath)
  return filePath
}

const writeAoaXlsx = (fileName, sheetName, aoa) => {
  const worksheet = XLSX.utils.aoa_to_sheet(aoa)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  const filePath = path.join(outDir, fileName)
  XLSX.writeFile(workbook, filePath)
  return filePath
}

const customers = [
  { 'Customer ID': 'C001', Name: 'Alice Chen', Phone: '13800138000', City: 'Shanghai' },
  { 'Customer ID': 'C002', Name: 'Bob Li', Phone: '13800138001', City: 'Beijing' },
  { 'Customer ID': 'C003', Name: 'Carol Wang', Phone: '13800138002', City: 'Shenzhen' },
]

const orders = [
  { customer_id: 'C001', 'Order No': 'O-1001', Amount: 199.9, Date: '2026-01-10' },
  { customer_id: 'C002', 'Order No': 'O-1002', Amount: 88.0, Date: '2026-01-12' },
  { customer_id: 'C001', 'Order No': 'O-1003', Amount: 42.5, Date: '2026-01-20' },
]

const support = [
  { 客户编号: 'C001', 邮箱: 'alice@example.com', 工单号: 'T-9001', 备注: '退款咨询' },
  { 客户编号: 'C003', 邮箱: 'carol@example.com', 工单号: 'T-9002', 备注: '发票抬头修改' },
]

const inventory = [
  { SKU: 'SKU-01', 'Serial Number': 'S-001', Qty: 10, 仓库: 'A1' },
  { SKU: 'SKU-02', 'Serial Number': 'S-002', Qty: 3, 仓库: 'A2' },
]

const customersTitleAoa = [
  ['Customer Export Report (Title Row)'],
  ['Generated At', '2026-02-05'],
  [],
  ['Customer ID', 'Name', 'Phone', 'City'],
  ['C001', 'Alice Chen', '13800138000', 'Shanghai'],
  ['C002', 'Bob Li', '13800138001', 'Beijing'],
  ['C003', 'Carol Wang', '13800138002', 'Shenzhen'],
]

const outputs = [
  writeXlsx('customers_a.xlsx', 'Customers', customers),
  writeAoaXlsx('customers_with_title.xlsx', 'Customers', customersTitleAoa),
  writeXlsx('orders_b.xlsx', 'Orders', orders),
  writeXlsx('support_c.xlsx', 'Support', support),
  writeXlsx('inventory_d.xlsx', 'Inventory', inventory),
]

const readBack = (filePath) => {
  const buf = fs.readFileSync(filePath)
  const wb = XLSX.read(buf, { type: 'buffer' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(ws, { defval: '' })
}

const sanity = outputs.map((p) => ({ file: path.basename(p), rows: readBack(p).length }))
process.stdout.write(JSON.stringify({ outDir, files: sanity }, null, 2) + '\n')
