import React from 'react'
import {Document,Page,Text,View,Image,StyleSheet,Font} from '@react-pdf/renderer'

const styles=StyleSheet.create({page:{padding:38,fontSize:10,color:'#111827',fontFamily:'Helvetica'},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start'},logo:{width:58,height:28,objectFit:'contain'},title:{fontSize:36,fontWeight:700,marginTop:40,marginBottom:30},muted:{color:'#6b7280',fontSize:9},cols:{flexDirection:'row',justifyContent:'space-between',gap:24},col:{width:'48%'},table:{marginTop:30,borderTop:'1 solid #d1d5db'},row:{flexDirection:'row',borderBottom:'1 solid #e5e7eb',paddingVertical:8},desc:{width:'55%'},qty:{width:'10%',textAlign:'right'},rate:{width:'17%',textAlign:'right'},amount:{width:'18%',textAlign:'right'},totals:{marginLeft:'auto',width:'45%',marginTop:18},totalRow:{flexDirection:'row',justifyContent:'space-between',paddingVertical:4},grand:{fontSize:15,fontWeight:700,borderTop:'1 solid #9ca3af',paddingTop:9,marginTop:5},footer:{position:'absolute',left:38,right:38,bottom:32,borderTop:'1 solid #e5e7eb',paddingTop:10,color:'#6b7280'}})
const m=n=>`LKR ${Number(n||0).toLocaleString('en-US',{maximumFractionDigits:0})}`

export function InvoiceDocument({invoice}){
  const c=invoice.companyRow||{}
  try{if(c.heading_font_url&&c.heading_font_name)Font.register({family:c.heading_font_name,src:c.heading_font_url})}catch{}
  try{if(c.body_font_url&&c.body_font_name)Font.register({family:c.body_font_name,src:c.body_font_url})}catch{}
  return <Document><Page size="A4" style={[styles.page,c.body_font_name?{fontFamily:c.body_font_name}:{}]}>
    <View style={styles.header}><View>{c.logo_url?<Image src={c.logo_url} style={styles.logo}/>:<Text>CHAKRA</Text>}<Text style={styles.muted}>{c.display_name||`Chakra ${invoice.company||''}`}</Text></View><Text>{invoice.invoice_number||'DRAFT'}</Text></View>
    <Text style={[styles.title,c.heading_font_name?{fontFamily:c.heading_font_name}:{}]}>Invoice</Text>
    <View style={styles.cols}><View style={styles.col}><Text style={styles.muted}>BILL TO</Text><Text style={{fontSize:14,fontWeight:700,marginTop:5}}>{invoice.client?.name||'Client name'}</Text><Text>{invoice.client?.email||''}</Text></View><View style={styles.col}><Text style={styles.muted}>PROJECT</Text><Text style={{fontSize:14,fontWeight:700,marginTop:5}}>{invoice.project?.name||'Project'}</Text><Text>Due {invoice.due||'—'}</Text></View></View>
    <View style={styles.table}><View style={styles.row}><Text style={styles.desc}>DESCRIPTION</Text><Text style={styles.qty}>QTY</Text><Text style={styles.rate}>RATE</Text><Text style={styles.amount}>AMOUNT</Text></View>{(invoice.items||[]).map((it,i)=><View style={styles.row} key={i}><Text style={styles.desc}>{it.description}</Text><Text style={styles.qty}>{it.qty}</Text><Text style={styles.rate}>{m(it.rate)}</Text><Text style={styles.amount}>{m(Number(it.qty||0)*Number(it.rate||0))}</Text></View>)}</View>
    <View style={styles.totals}><View style={styles.totalRow}><Text>Subtotal</Text><Text>{m(invoice.subtotal)}</Text></View><View style={styles.totalRow}><Text>Discount</Text><Text>- {m(invoice.disc)}</Text></View><View style={styles.totalRow}><Text>Tax</Text><Text>{m(invoice.taxVal)}</Text></View>{invoice.previous>0&&<View style={styles.totalRow}><Text>Previous payments</Text><Text>- {m(invoice.previous)}</Text></View>}<View style={[styles.totalRow,styles.grand]}><Text>Total due</Text><Text>{m(invoice.total)}</Text></View></View>
    {(c.bank_name||c.account_number)&&<View style={{marginTop:32}}><Text style={styles.muted}>PAYMENT DETAILS</Text><Text style={{marginTop:5}}>{c.bank_name||''}</Text><Text>{c.account_name||''}</Text><Text>{c.account_number||''}</Text></View>}
    {invoice.notes&&<Text style={{marginTop:22}}>{invoice.notes}</Text>}
    <View style={styles.footer}><Text>{c.invoice_footer||'Thank you for working with Chakra.'}</Text><Text>{c.email||''}{c.phone?` · ${c.phone}`:''}</Text></View>
  </Page></Document>
}
