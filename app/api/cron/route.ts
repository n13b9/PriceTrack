import Product from "@/lib/models/product.models";
import { connectToDB } from "@/lib/mongoose"
import { generateEmailBody, sendEmail } from "@/lib/nodemailer";
import { scrapeAmazonProduct } from "@/lib/scraper";
import { getAveragePrice, getEmailNotifType, getHighestPrice, getLowestPrice } from "@/lib/utils";
import { NextResponse } from "next/server";

export const maxDuration = 300;
export const dynamic = 'force-dynamic'
export const revalidate = 0;

export async function GET() {
    
    try {

    connectToDB();

    const products = await Product.find({});

    if(!products) throw new Error("no products found");

    //scrape latest product details and update DB

    const updatedProducts = await Promise.all(
            products.map(async(currentProduct)=>{
                const scrapedProduct = await scrapeAmazonProduct(currentProduct.url);

                if(!scrapedProduct) throw new Error("no product found");

                const updatedPriceHistory = [
                    ...currentProduct.priceHistory,
                        {price:scrapedProduct.currentPrice}
                ]
    
                const product = {
                    ...scrapedProduct,
                        priceHistory: updatedPriceHistory,
                        lowestPrice:getLowestPrice(updatedPriceHistory),
                        highestPrice:getHighestPrice(updatedPriceHistory),
                        averagePrice:getAveragePrice(updatedPriceHistory),
    
                }
            
                const updatedProduct = await Product.findOneAndUpdate(
                    {url:product.url},
                    product,
                );


        //check each prodcut status and send email accordingly 

                const emailNotifType = getEmailNotifType(scrapedProduct, currentProduct)
                    
                if(emailNotifType && updatedProduct.users.length>0) {
                    const ProductInfo = {
                        title:updatedProduct.title,
                        url:updatedProduct.url,
                    }

                    const emailContent = await generateEmailBody(ProductInfo,emailNotifType);

                    const userEmails = updatedProduct.users.map((user:any)=> user.email);

                    await sendEmail(emailContent, userEmails);
                }

                return updatedProduct

                })
    )
          return NextResponse.json({
            message:"ok", data:updatedProducts
          })
    } catch (error) {
        throw new Error(`Error in GET: ${error}`)
    }
}