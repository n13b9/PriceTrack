import mongoose from 'mongoose';

let isConnected = false; // var to track conection status

export const connectToDB = async()=> {
    mongoose.set('strictQuery', true);

    if(!process.env.MONGODB_URI) return console.log('MONGODB_URI is not defined');

    if(isConnected) return console.log('=> using existing db connection');

    try {
        await mongoose.connect(process.env.MONGODB_URI);

        isConnected = true;

        console.log('mongodb connected')

    } catch (error) {
        console.log(error)
    }
}