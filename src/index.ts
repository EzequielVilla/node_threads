import fs from "fs";
import path from "path";
import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
import sharp from "sharp";
import { exit } from "process";

isMainThread ? main() : processInThread();
/**
 *  @description Read the files, call a function readImageFile to get the buffer info.
 *  After that send to compress or change the image with the function compressImage
 * who calls a worker and return to the main thread the buffer with the changes.
 *  And with the new buffer write a new file in the folder "compressed"
 */
async function main() {
  // crear workers
  const dir = path.join(__dirname, "./../image");
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const imageBuffer = await readImageFile(filePath);
    try {
      console.log(`Start processing file: ${file}`);
      const processedImage = await compressImage(imageBuffer);
      const processedFilePath = path.join(
        __dirname,
        `./../compressed/edited-${file}`
      );
      fs.writeFileSync(processedFilePath, processedImage);
      console.log(`File ${file} compressed and saved to ${processedFilePath}`);
    } catch (error) {
      console.error(`Error processing file ${file}: ${error.message}`);
    }
  }
  exit(200);
}
/**
 * @description Read through chunks the buffer and return it to the main thread.
 * @param {string} filePath
 * @returns {Promise<Buffer>}
 */
async function readImageFile(filePath: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    const chunks: Buffer[] = [];

    stream.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    stream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    stream.on("error", (err) => {
      reject(err);
    });
  });
}

/**
 * Derive the compress process of the image to different threads.
 * @param {Buffer} imageBuffer
 */
async function compressImage(imageBuffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(__filename, {
      workerData: { imageBuffer },
    });
    worker.postMessage({ imageBuffer });
    worker.on("message", (compressedFile) => {
      resolve(compressedFile);
    });
    worker.on("error", (err) => {
      reject(err);
    });
    worker.on("exit", (code) => {
      if (code != 0) {
        reject(new Error(`Worker process exit with code: ${code}`));
      }
    });
  });
}
/**
 * @description Process in different threads the buffer that cames from the main thread.
 * In this case we do the next with the image:
 * Resize
 * Rotate
 * Transform to buffer again
 * Return to the main thread the new buffer image.
 */
function processInThread() {
  console.log("processInThread");
  parentPort.on("message", ({ imageBuffer }: { imageBuffer: Buffer }) => {
    console.log("on message in processInThread");
    sharp(imageBuffer)
      .resize(100, 100)
      .rotate(90)
      .toBuffer()
      .then((img) => {
        parentPort.postMessage(img);
      });
  });
  parentPort.on("messageerror", (err) => {
    throw new Error(err.message);
  });
  parentPort.on("close", (c) => {
    console.log(`Closed by: ${c}`);
  });
}
