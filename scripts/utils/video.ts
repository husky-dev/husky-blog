import { exec } from "child_process";

// You can stream copy if the MOV file contains video and audio that is compatible with MP4:
// ffmpeg -i input.mov -c copy -movflags +faststart  output.mp4
// This will convert the MOV to H.264 video and AAC audio:
// ffmpeg -i input.mov -c:v libx264 -c:a aac -vf format=yuv420p -movflags +faststart output.mp4
export const convertVideo = async (
  inputFile: string,
  outputFile: string
): Promise<void> =>
  new Promise((resolve, reject) => {
    exec(
      `ffmpeg -i "${inputFile}" -vcodec libx264 -acodec aac "${outputFile}"`,
      (err, stdout, stderr) => {
        if (err) return reject(stderr);
        return resolve();
      }
    );
  });

export const createVideoScreenshot = async (
  inputFile: string,
  outputFile: string
): Promise<void> =>
  new Promise((resolve, reject) => {
    exec(
      `ffmpeg -i "${inputFile}" -ss 00:00:01 -vframes 1 "${outputFile}"`,
      (err, stdout, stderr) => {
        if (err) return reject(stderr);
        return resolve();
      }
    );
  });
