const {test}=require('node:test');const assert=require('node:assert/strict');
const {parseDeepLink,findDeepLink,validateExternalUrl,validateSecureKey,validateSecureValue}=require('../electron/validation.cjs');
const ticket='a'.repeat(21)+'_-'+'B9'.repeat(10);
const bff=['https://coopseat.com','http://localhost:3000'];
test('parses the auth deep links the BFF sends',()=>{
 assert.deepEqual(parseDeepLink(`coopseat://auth/callback?ticket=${ticket}`),{kind:'callback',ticket});
 assert.deepEqual(parseDeepLink('coopseat://auth/linked'),{kind:'linked'});
 assert.deepEqual(parseDeepLink('coopseat://auth/confirmed/'),{kind:'confirmed'});
 assert.deepEqual(parseDeepLink('coopseat://auth/verified'),{kind:'verified'});
});
test('ignores unknown routes, bad tickets and other schemes',()=>{
 for(const raw of ['coopseat://auth/callback','coopseat://auth/callback?ticket=curto',`coopseat://auth/callback?ticket=${ticket}x`,'coopseat://auth/callback?ticket='+'%'.repeat(43),'coopseat://evil/run','https://coopseat.com/auth/linked',`coopseat://auth/linked?${'x'.repeat(600)}`,null,42])assert.equal(parseDeepLink(raw),null);
});
test('finds the deep link among second-instance arguments',()=>{
 assert.equal(findDeepLink(['C:\\CoopSeat.exe','--flag','coopseat://auth/linked']),'coopseat://auth/linked');
 assert.equal(findDeepLink(['C:\\CoopSeat.exe']),undefined);
 assert.equal(findDeepLink(undefined),undefined);
});
test('opens only the BFF and known KYC vendors in the browser',()=>{
 assert.equal(validateExternalUrl('https://coopseat.com/api/auth/oauth/google?client=desktop',bff),'https://coopseat.com/api/auth/oauth/google?client=desktop');
 assert.ok(validateExternalUrl('http://localhost:3000/signup',bff));
 assert.ok(validateExternalUrl('https://alchemy.veriff.me/v/abc',bff));
 assert.ok(validateExternalUrl('https://verify.didit.me/session/abcdef123456',bff));
 for(const raw of ['https://coopseat.com.evil.io/','http://veriff.me/x','https://notveriff.me/','https://didit.me.evil.io/','http://verify.didit.me/session/x','file:///C:/Windows/System32/calc.exe','javascript:alert(1)','ms-settings:','x'.repeat(5000),{}])assert.throws(()=>validateExternalUrl(raw,bff));
});
test('secure store accepts only allowlisted keys and bounded strings',()=>{
 assert.equal(validateSecureKey('auth.session'),'auth.session');
 for(const key of ['other','__proto__',null])assert.throws(()=>validateSecureKey(key));
 assert.equal(validateSecureValue('{}'),'{}');
 for(const value of [123,null,'x'.repeat(16385)])assert.throws(()=>validateSecureValue(value));
});
test('packaging registers the coopseat protocol',()=>{
 const build=require('../package.json').build;
 assert.deepEqual(build.protocols[0].schemes,['coopseat']);
 assert.deepEqual(require('../portable.config.cjs').protocols,build.protocols);
});
