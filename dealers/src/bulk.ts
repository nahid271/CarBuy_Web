import ExcelJS from 'exceljs';
import type { CatalogService } from '../../vehicle-data/src/catalog.ts';
import { parseBdt } from '../../listings/src/price.ts';
import { validateForSubmission } from '../../listings/src/validation.ts';
import type { Listing, ListingData } from '../../listings/src/types.ts';

export const bulkHeaders = ['stockNumber','chassisNumber','makeId','modelId','generationId','gradeId','gradeFreeText',
  'manufactureYear','mileageKm','engineCc','fuel','transmission','body','condition','registrationYear',
  'priceBdt','district','area','stockStatus','expectedArrival','afterSalesNotes','description'] as const;
export type BulkRow = { rowNumber:number; data:Partial<ListingData>; errors:string[] };
export type BulkReport = { total:number; valid:number; invalid:number; rows:BulkRow[] };

function parseCsv(text:string):string[][]{
  const rows:string[][]=[];let row:string[]=[];let cell='';let quoted=false;
  for(let i=0;i<text.length;i++){
    const char=text[i];
    if(quoted){if(char==='"'&&text[i+1]==='"'){cell+='"';i++}else if(char==='"')quoted=false;else cell+=char}
    else if(char==='"'){if(cell)throw new Error('Unexpected CSV quote');quoted=true}
    else if(char===','){row.push(cell);cell=''}
    else if(char==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell=''}
    else cell+=char;
  }
  if(quoted)throw new Error('Unclosed CSV quote');
  if(cell||row.length){row.push(cell);rows.push(row)}
  return rows;
}
export function csvTemplate():string{return bulkHeaders.join(',')+'\n'+[
  'STK-001','NHP10-1234567','toyota','aqua','aqua-nhp10','aqua-nhp10-x-urban','',
  '2018','45000','1496','hybrid','cvt','hatchback','reconditioned','',
  '28.5 lakh','Dhaka','Dhanmondi','ready','','','Clean car, papers available',
].map(csvCell).join(',')+'\n'}
export async function xlsxTemplate():Promise<Buffer>{
  const workbook=new ExcelJS.Workbook();const sheet=workbook.addWorksheet('CarBuy stock');
  sheet.addRow([...bulkHeaders]);sheet.addRow(parseCsv(csvTemplate())[1]);
  sheet.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};
  sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1E6744'}};
  sheet.columns.forEach(column=>{column.width=22});
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
function csvCell(value:unknown):string{const text=String(value??'');return /^[=+@-]/.test(text)?`"'${text.replaceAll('"','""')}"`:/[",\r\n]/.test(text)?`"${text.replaceAll('"','""')}"`:text}
export function csvRows(rows:readonly (readonly unknown[])[]):string{return rows.map(row=>row.map(csvCell).join(',')).join('\n')+'\n'}

export async function parseBulkFile(bytes:Buffer,fileName:string):Promise<Array<Record<string,string>>>{
  if(!bytes.length||bytes.length>5*1024*1024)throw new Error('Import file must be 1 byte–5 MB');
  let rows:string[][];
  if(fileName.toLowerCase().endsWith('.csv'))rows=parseCsv(bytes.toString('utf8').replace(/^\uFEFF/,''));
  else if(fileName.toLowerCase().endsWith('.xlsx')){
    const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(bytes as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const sheet=workbook.worksheets[0];if(!sheet)throw new Error('Workbook has no worksheet');
    if(sheet.rowCount>501)throw new Error('Maximum 500 stock rows per import');
    rows=[];sheet.eachRow({includeEmpty:true},row=>{
      const values:string[]=[];
      for(let i=1;i<=bulkHeaders.length;i++){
        const cell=row.getCell(i);const value=cell.value;
        if(value&&typeof value==='object'&&('formula' in value||'sharedFormula' in value))throw new Error('Spreadsheet formulas are not allowed');
        values.push(cell.text.trim());
      }
      rows.push(values);
    });
  }else throw new Error('Use .csv or .xlsx');
  if(rows.length<2)throw new Error('File has no stock rows');
  const header=rows[0].map(x=>x.trim());
  if(header.length!==bulkHeaders.length||header.some((x,i)=>x!==bulkHeaders[i]))throw new Error('Use the CarBuy template headers in order');
  const data=rows.slice(1).filter(row=>row.some(value=>value.trim()));
  if(data.length>500)throw new Error('Maximum 500 stock rows per import');
  return data.map(row=>Object.fromEntries(bulkHeaders.map((key,i)=>[key,row[i]?.trim()??''])));
}
const numericKeys=new Set(['manufactureYear','mileageKm','engineCc','registrationYear']);
export function bulkData(row:Record<string,string>):Partial<ListingData>{
  const data:Record<string,unknown>={negotiable:false};
  for(const key of bulkHeaders){const value=row[key]?.trim();if(!value)continue;
    data[key]=numericKeys.has(key)?Number(value):key==='priceBdt'?(parseBdt(value)??Number.NaN):value;
  }
  return data as Partial<ListingData>;
}
export async function validateBulkRows(rows:Array<Record<string,string>>,catalog:CatalogService,existingStock:string[]=[]):Promise<BulkReport>{
  const seen=new Set(existingStock.map(x=>x.toLowerCase()));
  const report:BulkRow[]=[];
  for(let index=0;index<rows.length;index++){
    const data=bulkData(rows[index]);const stock=data.stockNumber?.toLowerCase();
    const listing={sellerType:'dealer',data,photos:[0,1,2,3].map(i=>({sha256:`placeholder-${i}`}))} as Listing;
    const errors=await validateForSubmission(listing,catalog);
    if(stock&&seen.has(stock))errors.push('Duplicate stock number in this file or dealership');
    if(stock)seen.add(stock);
    report.push({rowNumber:index+2,data,errors});
  }
  return {total:report.length,valid:report.filter(x=>!x.errors.length).length,invalid:report.filter(x=>x.errors.length).length,rows:report};
}
export function stockFromPhotoName(name:string):string{
  const match=/^([A-Za-z0-9_-]{1,32})__\d+\.(jpe?g|png|webp|avif)$/i.exec(name);
  if(!match)throw new Error('Name photos STOCKNUMBER__1.jpg, STOCKNUMBER__2.jpg, etc.');
  return match[1];
}
