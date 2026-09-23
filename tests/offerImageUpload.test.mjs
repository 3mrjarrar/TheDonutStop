import test from 'node:test';
import assert from 'node:assert/strict';
import { validateOfferImage, uploadOfferImage, offerImageMaxBytes } from '../src/lib/offerImageUpload.js';
test('offer uploads validate supported images and size before contacting storage', async () => {
  for (const type of ['image/jpeg','image/png','image/webp','image/gif']) assert.doesNotThrow(()=>validateOfferImage({type,size:offerImageMaxBytes}));
  for (const file of [{type:'image/svg+xml',size:10},{type:'text/html',size:10},{type:'image/png',size:0},{type:'image/png',size:offerImageMaxBytes+1}]) {
    await assert.rejects(uploadOfferImage(null,file));
  }
});
test('uploads use unique immutable paths and return the stored image URL', async () => {
  const paths=[];
  const file={type:'image/png',size:12};
  const client={storage:{from(bucket){
    assert.equal(bucket,'offer-images');
    return {async upload(path,body,options){paths.push(path);assert.equal(body,file);assert.equal(options.upsert,false);assert.equal(options.contentType,'image/png');return {error:null};},getPublicUrl(path){return {data:{publicUrl:`https://example.com/${path}`}};}};
  }}};
  const url=await uploadOfferImage(client,file);
  await uploadOfferImage(client,file);
  assert.match(url,/https:\/\/example.com\/[\da-f-]{36}\.png$/);
  assert.notEqual(paths[0],paths[1]);
});
test('failed uploads cannot produce a saved image URL',async()=>{
  const client={storage:{from(){return {async upload(){return {error:new Error('Upload failed')};},getPublicUrl(){assert.fail('Must not use failed upload');}};}}};
  await assert.rejects(uploadOfferImage(client,{type:'image/png',size:12}),/Upload failed/);
});
import { offerUploadError } from '../src/lib/offerImageUpload.js';
test('storage configuration errors identify the fix instead of blaming the connection',()=>{
  assert.match(offerUploadError({code:'NoSuchBucket',message:'Bucket not found',statusCode:'404'}),/202609230002_offer_image_uploads.sql/);
  assert.match(offerUploadError({message:'new row violates row-level security policy',statusCode:'403'}),/صلاحية/);
  assert.match(offerUploadError({message:'mime type not supported'}),/صيغة/);
  assert.match(offerUploadError({statusCode:'413'}),/5/);
  assert.match(offerUploadError(new Error('Failed to fetch')),/الاتصال/);
});
