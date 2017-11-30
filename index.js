const Promise = require('bluebird');
const im = require('imagemagick');
const Tesseract = require('tesseract.js');
const fs = require('fs');
const _ = require('lodash');
const images = fs.readdirSync('./dataset');
const data = {};

Tesseract.create({
  workerPath: './node_modules/tesseract.js/dist/worker.js',
  langPath: './eng.traineddata',
  corePath: './node_modules/tesseract.js-core/index.js',
});

function doErodeAndDilateImage(image) {
  return new Promise((resolve, reject) => {
    im.convert([`./dataset/${image}`, '-resize', '320x240+0+0', '-noise', '5', '-median', '5', '-unsharp', '5', '-normalize', '-colorspace', 'Gray', `./dataset_manipulated/manipulated_${image}`], (err, stdout) => {
      console.log(`Sharpen image ${image}...`);
      if (err) reject(err);
      // magick convert black.png -morphology ErodeIntensity Octagon:4 erode_intensity_black.png
      im.convert([`./dataset_manipulated/manipulated_${image}`, '-morphology', 'ErodeIntensity', 'Octagon:2', `./dataset_eroded/eroded_${image}`], (err, stdout) => {
        console.log(`Eroding image ${image}...`);
        if (err) reject(err);
        // magick convert black.png -morphology DilateIntensity Octagon:12 dilate_intensity_color.png  
        im.convert([`./dataset_eroded/eroded_${image}`, '-morphology', 'DilateIntensity', 'Octagon:8', `./dataset_dilated/dilated_${image}`], (err, stdout) => {
          console.log(`Dialating image ${image}...`);
          if (err) reject(err);
          resolve(stdout);
        });
      });
    });
  });
}

function recognizeText(image) {
  return new Promise((resolve, reject) => {
    return Tesseract.recognize(image, {
      tessedit_char_whitelist: '0123456789',
      tessedit_char_blacklist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    })
      .then(result => resolve(result))
      .catch(err => reject(err));
  });
}

function findText(image) {
  return new Promise((resolve, reject) => {
    return doErodeAndDilateImage(image)
      .then(() => {
        return recognizeText(`./dataset_dilated/dilated_${image}`)
      })
      .then(result => {
        data[image].push({
          text: result.text,
          confidence: result.confidence
        });
        return result;
      })
      .then(() => {
        return recognizeText(`./dataset_eroded/eroded_${image}`)
      })
      .then(result => {
        data[image].push({
          text: result.text,
          confidence: result.confidence
        });
        return result;
      })
      .then(() => {
        return recognizeText(`./dataset_manipulated/manipulated_${image}`)
      })
      .then(result => {
        data[image].push({
          text: result.text,
          confidence: result.confidence
        });
        resolve(result);
      })
      .catch(err => reject(err));  
  });  
}


Promise.mapSeries(images, image => {
  if (!image.startsWith('.')) {
    data[image] = [];
    return findText(image)
  }
})
.then(() => console.log(data));