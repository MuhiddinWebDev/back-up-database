import config from './firebaseConfig.js';
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytesResumable } from 'firebase/storage';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config()
initializeApp(config)
const SERVER_NAME = process.env.SERVER_NAME;
const storage = getStorage()
const auth = getAuth();

const giveCurrentDateTime = () => {
    const today = new Date();
    const date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    const time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    const dateTime = SERVER_NAME + " | " + date + ' ' + time;
    return dateTime;
}


export async function uploadFunc(filePath) {
    const email = process.env.FIREBASE_EMAIL;
    const password = process.env.FIREBASE_PASSWORD;
    const client_name = process.env.CLIENT_NAME;
    try {
        await signInWithEmailAndPassword(auth, email, password);
        console.log('User signed in successfully');

        const dateTime = giveCurrentDateTime();
        const storageRef = ref(storage, `files/${dateTime}_${client_name}.zip`);
        const metadata = {
            contentType: 'application/zip',
        };
        
        console.log('Uploading file...');

        const fileBuffer = fs.readFileSync(filePath);
        await uploadBytesResumable(storageRef, fileBuffer, metadata);
        console.log("File uploaded successfully");
    } catch (error) {
        console.error("Error uploading file:", error.message);
    }
}