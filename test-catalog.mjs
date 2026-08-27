import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context={window:{}};
vm.createContext(context);
for(const file of ['catalog-core.js','catalog-1.js','catalog-2.js','catalog-3.js','catalog-4.js','catalog-5.js','catalog-6.js']){
  vm.runInContext(fs.readFileSync(new URL(`./${file}`,import.meta.url),'utf8'),context,{filename:file});
}

const cities=context.window.KV_CITY;
const langs=context.window.KV_LANG;
const interests=context.window.KV_INTERESTS;
const names=Object.keys(cities);

assert.equal(names.length,100,'Kidventuro must expose exactly 100 destination catalogs');
assert.ok(Object.keys(interests).length>=16,'interest catalog unexpectedly shrank');

for(const name of names){
  const city=cities[name];
  assert.ok(city.flag&&city.country&&city.lang,`${name}: basic metadata missing`);
  assert.ok(langs[city.lang],`${name}: language ${city.lang} is not defined`);
  assert.ok(Array.isArray(city.marks)&&city.marks.length>=4,`${name}: needs 4 landmarks`);
  assert.ok(Array.isArray(city.food)&&city.food.length>=4,`${name}: needs 4 foods`);
  assert.ok(Array.isArray(city.facts)&&city.facts.length>=3,`${name}: needs 3 facts`);
  assert.ok(Array.isArray(city.hunt)&&city.hunt.length>=10,`${name}: scavenger hunt is too short`);
  assert.ok(Array.isArray(city.quiz)&&city.quiz.length>=3,`${name}: needs 3 quiz questions`);
  city.quiz.forEach((q,i)=>assert.ok(Array.isArray(q)&&q.length>=5,`${name}: quiz ${i+1} needs question + 4 choices`));
}

const expansion=fs.readFileSync(new URL('./site-expansion.js',import.meta.url),'utf8');
const expansion2=fs.readFileSync(new URL('./site-expansion-2.js',import.meta.url),'utf8');
for(const name of names.slice(25,50)) assert.ok(expansion.includes(`'${name}'`),`landing expansion missing ${name}`);
for(const name of names.slice(50)) assert.ok(expansion2.includes(`"${name}"`)||expansion2.includes(`'${name}'`),`second landing expansion missing ${name}`);
assert.ok(expansion2.includes('KIDVENTURO_DESTINATION_COUNT=100'),'landing destination count marker missing');

console.log(`Catalog validation passed: ${names.length} destinations, ${Object.keys(langs).length} language sets.`);
