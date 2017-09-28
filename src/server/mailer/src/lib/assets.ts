import { settings } from './settings';

function imageUrl(relative: string) {
  const { s3 } = settings.assets;
  if (s3.cdn) {
    return `https://${s3.cdn}/${relative}`;
  } else {
    return `https://${s3.bucket}.s3.amazonaws.com/${relative}`;
  }
};

function assetUrl(relative: string) {
  const { s3 } = settings.assets;
  if (s3.cdn) {
    return `https://${s3.cdn}/${relative}`;
  } else {
    return relative;
  }
};

function s3url(relative: string) {
  return imageUrl(`static/${relative}`);
};

export { imageUrl, assetUrl, s3url };