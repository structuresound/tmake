import { settings } from './settings';

export function s3domain(region: string) {
  // if (region == 'us-west-2') {
  //   return `s3-${region}.amazonaws.com`
  // }
  return 's3.amazonaws.com';
}

export function imageUrl(relative: string) {
  const { s3 } = settings.assets;
  if (s3.cdn) {
    return `https://${s3.cdn}/${relative}`;
  } else {
    return `https://${s3.bucket}.${s3domain(s3.region)}/${relative}`;
  }
};

export function assetUrl(relative: string) {
  const { s3 } = settings.assets;
  if (s3.cdn) {
    return `https://${s3.cdn}/${relative}`;
  } else {
    return relative;
  }
};

export function s3url(relative: string) {
  return imageUrl(`static/${relative}`);
};