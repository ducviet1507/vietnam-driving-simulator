import assert from 'node:assert/strict';

export async function checkLearnerQuiz(page) {
  const pit = page.locator('#pit');
  const practice = page.getByRole('button', {name:'Ôn một câu với Chú Tư'});
  const more = pit.getByRole('button', {name:'Làm thêm một câu'});
  const resume = pit.getByRole('button', {name:'Lái tiếp', exact:true});
  async function answer() {
    const choices = pit.locator('#choices button');
    await choices.first().click();
    if (await choices.first().getAttribute('data-answer-result') === 'wrong') {
      await pit.locator('#choices button[data-answer-result="correct"]').click();
    }
    await more.waitFor();
  }

  await page.locator('#pause').click();
  const before = await page.evaluate(() => {
    hp=67;
    return [car.x,car.z,distance];
  });
  await practice.click();
  await answer();
  await more.click();
  assert.equal(await more.isVisible(), false);
  await page.keyboard.press('Escape');
  await pit.waitFor({state:'hidden'});
  assert.deepEqual(await page.evaluate(() => [mode,hp,car.x,car.z,distance]), ['drive',67,...before]);

  await page.evaluate(() => {
    cooldown=0;
    hurt('car',{closing:12,delta:12,damage:70,strength:.4,energy:40000},{nx:1,nz:0});
  });
  await pit.waitFor();
  assert.equal(await resume.isVisible(), false);
  await page.keyboard.press('Escape');
  assert.equal(await pit.isVisible(), true);
  await answer();
  await more.click();
  await answer();
  await resume.click();
  assert.deepEqual(await page.evaluate(() => [mode,hp,Boolean(car.dent)]), ['drive',100,false]);
}
