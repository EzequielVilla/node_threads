"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const worker_threads_1 = require("worker_threads");
const sharp_1 = __importDefault(require("sharp"));
const process_1 = require("process");
if (worker_threads_1.isMainThread) {
    main();
}
else {
    processInThread();
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        // crear workers
        const dir = path_1.default.join(__dirname, "./../image");
        const files = fs_1.default.readdirSync(dir);
        for (const file of files) {
            const filePath = path_1.default.join(dir, file);
            const imageBuffer = yield readImageFile(filePath);
            try {
                console.log(`Start processing file: ${file}`);
                const compressedImage = yield compressImage(imageBuffer);
                console.log({ compressedImage });
                const compressedFilePath = path_1.default.join(__dirname, `./../compressed/edited-${file}`);
                fs_1.default.writeFileSync(compressedFilePath, compressedImage);
                console.log(`File ${file} compressed and saved to ${compressedFilePath}`);
            }
            catch (error) {
                console.error(`Error processing file ${file}: ${error.message}`);
            }
        }
        (0, process_1.exit)(200);
    });
}
function processInThread() {
    console.log("processInThread");
    worker_threads_1.parentPort.on("message", ({ imageBuffer }) => {
        console.log("on message in processInThread");
        (0, sharp_1.default)(imageBuffer)
            .resize(100, 100)
            .rotate(90)
            .toBuffer()
            .then((img) => {
            worker_threads_1.parentPort.postMessage(img);
        });
    });
    worker_threads_1.parentPort.on("messageerror", (err) => {
        throw new Error(err.message);
    });
    worker_threads_1.parentPort.on("close", (m) => {
        console.log(`Closed by: ${m}`);
    });
}
/**
 * Derive the compress process of the image to different threads.
 * @param imageBuffer
 */
function compressImage(imageBuffer) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const worker = new worker_threads_1.Worker(__filename, {
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
    });
}
function readImageFile(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const stream = fs_1.default.createReadStream(filePath);
            const chunks = [];
            stream.on("data", (chunk) => {
                chunks.push(chunk);
            });
            stream.on("end", () => {
                resolve(Buffer.concat(chunks));
            });
            stream.on("error", (err) => {
                reject(err);
            });
        });
    });
}
