import { expect, test, type Page } from '@playwright/test';

async function placeInitialHokkaido(page: Page): Promise<void> {
  await expect(page.getByTestId('piece')).toHaveCount(0);
  await page.getByRole('button', { name: '地図に出す' }).click();
  await expect(page.getByTestId('piece')).toHaveCount(1);
  await expect(page.getByText('ドラッグして、好きな場所に重ねてみよう')).toBeVisible();
  const mapBox = await page.locator('#map').boundingBox();
  const pieceBox = await page.locator('.piece-shape').boundingBox();
  if (!mapBox || !pieceBox) throw new Error('initial map or piece has no bounds');
  expect(pieceBox.x + pieceBox.width / 2).toBeCloseTo(mapBox.x + mapBox.width / 2, 0);
  expect(pieceBox.y + pieceBox.height / 2).toBeCloseTo(mapBox.y + mapBox.height / 2, 0);
}

async function setZoom(page: Page, value: number): Promise<void> {
  await page.getByRole('button', { name: '地図を全体表示' }).click();
  const clicks = Math.max(0, Math.ceil(Math.log(value / 1.1) / Math.log(1.35)));
  for (let index = 0; index < clicks; index += 1) {
    await page.getByRole('button', { name: '地図を拡大' }).click();
  }
}

test('adds, drags and rotates Hokkaido', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '都道府県移動まっぷす' })).toBeVisible();
  await expect(page.locator('.prefecture-boundary')).toHaveCount(47);
  await placeInitialHokkaido(page);
  const initialViewBox = await page.locator('#map').getAttribute('viewBox');
  await setZoom(page, 2);
  await expect(page.locator('#map')).not.toHaveAttribute('viewBox', initialViewBox!);
  await setZoom(page, 30);
  const maxViewBox = (await page.locator('#map').getAttribute('viewBox'))!.split(' ').map(Number);
  expect(maxViewBox[2]).toBeCloseTo(1000 / 30, 5);
  await setZoom(page, 1.1);
  await expect(page.locator('#map')).toHaveAttribute('viewBox', initialViewBox!);
  const piece = page.getByTestId('piece');
  await expect(piece).toHaveCount(1);
  await expect(page.locator('.selection-box')).toHaveCount(1);

  const beforeDrag = await piece.getAttribute('transform');
  const box = await piece.locator('.piece-shape').boundingBox();
  if (!box) throw new Error('piece has no bounds');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 45, box.y + box.height / 2 + 25);
  await page.mouse.up();
  await expect(piece).not.toHaveAttribute('transform', beforeDrag!);
  await expect(page.locator('#first-guide')).toHaveClass(/is-hidden/);

  const beforeRotate = await piece.getAttribute('transform');
  const handle = page.locator('[data-rotate-handle]');
  const handleBox = await handle.boundingBox();
  if (!handleBox) throw new Error('rotation handle has no bounds');
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox.x + 70, handleBox.y + 30);
  await page.mouse.up();
  await expect(piece).not.toHaveAttribute('transform', beforeRotate!);

});

test('adds another prefecture at the current viewport center without clearing existing pieces', async ({ page }) => {
  await page.goto('/');
  await placeInitialHokkaido(page);
  await setZoom(page, 2);
  const map = page.locator('#map');
  const mapBox = await map.boundingBox();
  if (!mapBox) throw new Error('map has no bounds');
  await map.evaluate((element, box) => {
    const dispatch = (type: string, x: number, y: number) => element.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerId: 31, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y,
    }));
    dispatch('pointerdown', box.x + 40, box.y + box.height - 40);
    dispatch('pointermove', box.x + 100, box.y + box.height - 80);
    dispatch('pointerup', box.x + 100, box.y + box.height - 80);
  }, mapBox);

  await page.getByLabel('都道府県', { exact: true }).selectOption({ label: '東京都' });
  await page.getByRole('button', { name: '地図に出す' }).click();
  await expect(page.getByTestId('piece')).toHaveCount(2);
  const worldPlacement = await page.getByTestId('piece').nth(1).evaluate((group) => {
    const box = group.querySelector<SVGRectElement>('.selection-box')!;
    const transform = group.getAttribute('transform')!;
    const translate = transform.match(/translate\(([-\d.]+) ([-\d.]+)\)/)!;
    return {
      centerX: Number(box.getAttribute('x')) + Number(box.getAttribute('width')) / 2 + Number(translate[1]),
      centerY: Number(box.getAttribute('y')) + Number(box.getAttribute('height')) / 2 + Number(translate[2]),
    };
  });
  const currentViewBox = (await map.getAttribute('viewBox'))!.split(' ').map(Number);
  expect(worldPlacement.centerX).toBeCloseTo(currentViewBox[0] + currentViewBox[2] / 2, 5);
  expect(worldPlacement.centerY).toBeCloseTo(currentViewBox[1] + currentViewBox[3] / 2, 5);
});

test('offers all 47 prefectures and adds a Phase 2 prefecture', async ({ page }) => {
  await page.goto('/');
  const select = page.getByLabel('都道府県', { exact: true });
  await expect(select.locator('option')).toHaveCount(47);
  await select.selectOption({ label: '長野県' });
  await page.getByRole('button', { name: '地図に出す' }).click();
  await expect(page.getByTestId('piece')).toHaveCount(1);
  await expect(page.locator('.piece-shape')).toHaveAttribute('d', /^M.+Z$/);
});

test('undoes add, delete and reset one operation at a time', async ({ page }) => {
  await page.goto('/');
  const undo = page.getByRole('button', { name: '1つ戻す' });
  await expect(undo).toBeDisabled();
  await placeInitialHokkaido(page);
  await expect(undo).toBeEnabled();
  await undo.click();
  await expect(page.getByTestId('piece')).toHaveCount(0);

  await page.getByRole('button', { name: '地図に出す' }).click();
  await page.getByRole('button', { name: '消す' }).click();
  await expect(page.getByTestId('piece')).toHaveCount(0);
  await undo.click();
  await expect(page.getByTestId('piece')).toHaveCount(1);

  await page.getByRole('button', { name: 'リセット' }).click();
  await expect(page.getByTestId('piece')).toHaveCount(0);
  await undo.click();
  await expect(page.getByTestId('piece')).toHaveCount(1);
});

test('makes the small Tokyo MultiPolygon easy to grab and drag', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('都道府県', { exact: true }).selectOption({ label: '東京都' });
  await page.getByRole('button', { name: '地図に出す' }).click();
  const tokyo = page.getByTestId('piece');
  const before = await tokyo.getAttribute('transform');
  await expect(tokyo.locator('.piece-hit-area')).toHaveCSS('stroke-width', '30px');
  const target = await page.locator('.map-card').evaluate((card) => {
    const rect = card.getBoundingClientRect();
    for (let y = rect.top + 20; y < rect.bottom - 20; y += 4) {
      for (let x = rect.left + 20; x < rect.right - 20; x += 4) {
        const element = document.elementFromPoint(x, y);
        if (element?.closest('[data-piece-id]')) return { x, y };
      }
    }
    return null;
  });
  if (!target) throw new Error('Tokyo has no tappable point');
  await page.mouse.move(target.x, target.y);
  await page.mouse.down();
  await page.mouse.move(target.x + 42, target.y + 24, { steps: 6 });
  await page.mouse.up();
  await expect(tokyo).not.toHaveAttribute('transform', before!);
});

test('pans and pinches the shared map viewport without changing piece world state', async ({ page }) => {
  await page.goto('/');
  await placeInitialHokkaido(page);
  const piece = page.getByTestId('piece');
  const pieceTransform = await piece.getAttribute('transform');
  await setZoom(page, 2);
  const zoomedViewBox = await page.locator('#map').getAttribute('viewBox');
  const planeBeforePan = await page.locator('#map .plane').boundingBox();

  const mapBox = await page.locator('#map').boundingBox();
  if (!mapBox) throw new Error('map has no bounds');
  await page.locator('#map').evaluate((map, box) => {
    const dispatch = (type: string, x: number, y: number) => map.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y,
    }));
    dispatch('pointerdown', box.x + 30, box.y + box.height - 30);
    dispatch('pointermove', box.x + 80, box.y + box.height - 60);
    dispatch('pointerup', box.x + 80, box.y + box.height - 60);
  }, mapBox);
  await expect(page.locator('#map')).not.toHaveAttribute('viewBox', zoomedViewBox!);
  await expect(piece).toHaveAttribute('transform', pieceTransform!);
  const planeAfterPan = await page.locator('#map .plane').boundingBox();
  expect(planeAfterPan?.x).not.toBe(planeBeforePan?.x);

  const viewBoxBeforePinch = await page.locator('#map').getAttribute('viewBox');
  await page.locator('#map').evaluate((map, box) => {
    const dispatch = (type: string, pointerId: number, x: number, y: number) => map.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerId, pointerType: 'touch', isPrimary: pointerId === 11, clientX: x, clientY: y,
    }));
    dispatch('pointerdown', 11, box.x + 100, box.y + 180);
    dispatch('pointerdown', 12, box.x + 200, box.y + 180);
    dispatch('pointermove', 11, box.x + 70, box.y + 160);
    dispatch('pointermove', 12, box.x + 240, box.y + 200);
    dispatch('pointerup', 11, box.x + 70, box.y + 160);
    dispatch('pointerup', 12, box.x + 240, box.y + 200);
  }, mapBox);
  await expect(page.locator('#map')).not.toHaveAttribute('viewBox', viewBoxBeforePinch!);
  await expect(piece).toHaveAttribute('transform', pieceTransform!);

  const viewBoxAfterPinch = (await page.locator('#map').getAttribute('viewBox'))!.split(' ').map(Number);
  await page.locator('#map').evaluate((map, box) => {
    const dispatch = (type: string, pointerId: number, x: number, y: number) => map.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerId, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y,
    }));
    dispatch('pointermove', 12, box.x + 260, box.y + 210);
    dispatch('pointerdown', 13, box.x + 50, box.y + box.height - 55);
    dispatch('pointermove', 13, box.x + 95, box.y + box.height - 80);
    dispatch('pointerup', 13, box.x + 95, box.y + box.height - 80);
  }, mapBox);
  const viewBoxAfterPan = (await page.locator('#map').getAttribute('viewBox'))!.split(' ').map(Number);
  expect(viewBoxAfterPan[2]).toBeCloseTo(viewBoxAfterPinch[2], 6);
  expect(viewBoxAfterPan[0]).not.toBe(viewBoxAfterPinch[0]);

  await page.getByRole('button', { name: '地図を全体表示' }).click();
  const fittedViewBox = (await page.locator('#map').getAttribute('viewBox'))!.split(' ').map(Number);
  expect(fittedViewBox[2]).toBeCloseTo(1000 / 1.1, 5);
  await expect(piece).toHaveAttribute('transform', pieceTransform!);
});

test('deletes only the selected piece', async ({ page }) => {
  await page.goto('/');
  await placeInitialHokkaido(page);
  await page.getByLabel('都道府県', { exact: true }).selectOption({ label: '東京都' });
  await page.getByRole('button', { name: '地図に出す' }).click();
  await expect(page.getByTestId('piece')).toHaveCount(2);
  await page.getByRole('button', { name: '消す' }).click();
  await expect(page.getByTestId('piece')).toHaveCount(1);
  await expect(page.getByRole('button', { name: '消す' })).toBeDisabled();
  await expect(page.getByTestId('piece').locator('.piece-shape')).toHaveAttribute('d', /M.+M/);
});

test('persists work and resets pieces, selection and camera immediately', async ({ page }) => {
  await page.goto('/');
  await placeInitialHokkaido(page);
  await page.getByLabel('都道府県', { exact: true }).selectOption({ label: '東京都' });
  await page.getByRole('button', { name: '地図に出す' }).click();
  await setZoom(page, 5);
  await page.reload();
  await expect(page.getByTestId('piece')).toHaveCount(2);
  const restoredViewBox = await page.locator('#map').getAttribute('viewBox');
  expect(Number(restoredViewBox!.split(' ')[2])).toBeLessThan(500);
  let dialogOpened = false;
  page.once('dialog', async (dialog) => { dialogOpened = true; await dialog.dismiss(); });
  await page.getByRole('button', { name: 'リセット' }).click();
  expect(dialogOpened).toBe(false);
  await expect(page.getByTestId('piece')).toHaveCount(0);
  await expect(page.getByLabel('都道府県', { exact: true })).toHaveValue('JP-01');
  const resetViewBox = (await page.locator('#map').getAttribute('viewBox'))!.split(' ').map(Number);
  expect(resetViewBox[2]).toBeCloseTo(1000 / 1.1, 5);
  await expect(page.getByRole('button', { name: '消す' })).toBeDisabled();
  await page.reload();
  await expect(page.getByTestId('piece')).toHaveCount(0);
  await expect(page.getByLabel('都道府県', { exact: true })).toHaveValue('JP-01');
  await expect(page.getByRole('button', { name: '地図に出す' })).toBeVisible();
});

test('renders all Phase 1 MultiPolygons and falls back to PNG download', async ({ page }) => {
  for (const label of ['東京都', '香川県', '沖縄県']) {
    await page.goto('/');
    await page.getByLabel('都道府県', { exact: true }).selectOption({ label });
    await page.getByRole('button', { name: '地図に出す' }).click();
    await expect(page.locator('.piece-shape').last()).toHaveAttribute('d', /^M.+Z$/);
  }
  await page.goto('/');
  await page.getByLabel('都道府県', { exact: true }).selectOption({ label: '沖縄県' });
  await page.getByRole('button', { name: '地図に出す' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'シェア' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^prefecture-map-okinawa-\d{8}-\d{4}\.png$/);
});

test('shares a PNG file through Web Share API when supported', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: ShareData) => {
        (window as typeof window & { sharedData?: ShareData }).sharedData = data;
      },
    });
  });
  await page.goto('/');
  await placeInitialHokkaido(page);
  await page.getByRole('button', { name: 'シェア' }).click();
  await expect.poll(() => page.evaluate(() => Boolean((window as typeof window & { sharedData?: ShareData }).sharedData))).toBe(true);
  const shared = await page.evaluate(() => {
    const data = (window as typeof window & { sharedData?: ShareData }).sharedData;
    return { fileType: data?.files?.[0]?.type, fileSize: data?.files?.[0]?.size, title: data?.title, text: data?.text, url: data?.url };
  });
  expect(shared.fileType).toBe('image/png');
  expect(shared.fileSize).toBeGreaterThan(10_000);
  expect(shared.title).toBe('都道府県移動まっぷす');
  expect(shared.text).toBe('#都道府県移動まっぷす\nhttps://www.shikode.com/thinking-design/moving-maps/');
  expect(shared.text).not.toContain('北海道を、実際の縮尺のまま動かしました。');
  expect(shared.url).toBeUndefined();
});

test('keeps primary controls usable at mobile width', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile project only');
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/');
  const mobileMapBox = await page.locator('.map-card').boundingBox();
  if (!mobileMapBox) throw new Error('mobile map card has no bounds');
  expect(mobileMapBox.height / mobileMapBox.width).toBeGreaterThan(0.88);
  await expect(page.getByRole('button', { name: '地図に出す' })).toBeVisible();
  await expect(page.getByRole('button', { name: '消す' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'シェア' })).toBeHidden();
  await placeInitialHokkaido(page);
  await expect(page.getByRole('button', { name: 'シェア' })).not.toHaveCSS('background-image', 'none');
  for (const name of ['地図に出す', '消す', 'シェア', 'リセット']) {
    const button = page.getByRole('button', { name });
    await expect(button).toBeVisible();
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  await expect(page.getByRole('slider')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '地図を拡大' })).toBeVisible();
  await expect(page.getByRole('button', { name: '地図を縮小' })).toBeVisible();
  const selectBox = await page.getByLabel('都道府県', { exact: true }).boundingBox();
  const resetBox = await page.getByRole('button', { name: 'リセット' }).boundingBox();
  if (!selectBox || !resetBox) throw new Error('mobile select or reset has no bounds');
  expect(selectBox.y).toBeGreaterThan(mobileMapBox.y + mobileMapBox.height);
  expect(resetBox.x).toBeGreaterThan(mobileMapBox.x + mobileMapBox.width * .65);
  expect(resetBox.y).toBeLessThan(mobileMapBox.y + 70);
  await expect(page.locator('#zoom-value')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '地図を全体表示' })).toBeVisible();
  await page.getByLabel('都道府県', { exact: true }).selectOption('JP-13');
  await page.getByRole('button', { name: '地図に出す' }).tap();
  await expect(page.getByTestId('piece')).toHaveCount(2);
  const widthBefore = await page.evaluate(() => ({
    viewport: window.innerWidth,
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  const shapeBox = await page.locator('.piece-shape').last().boundingBox();
  if (!shapeBox) throw new Error('mobile piece has no bounds');
  await page.mouse.move(shapeBox.x + shapeBox.width / 2, shapeBox.y + shapeBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(shapeBox.x + shapeBox.width / 2 + 35, shapeBox.y + shapeBox.height / 2 + 20, { steps: 8 });
  await page.mouse.up();
  const widthAfter = await page.evaluate(() => ({
    viewport: window.innerWidth,
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(widthBefore).toEqual({ viewport: 320, client: 320, scroll: 320 });
  expect(widthAfter).toEqual(widthBefore);
});

test('fits phone, tablet and desktop widths without horizontal overflow', async ({ page }) => {
  for (const width of [375, 390, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
    await page.goto('/');
    const dimensions = await page.evaluate(() => ({
      inner: window.innerWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scroll).toBe(dimensions.inner);
    await expect(page.locator('.map-card')).toBeVisible();
    await expect(page.getByRole('button', { name: '地図に出す' })).toBeVisible();
    await expect(page.getByLabel('都道府県', { exact: true })).toBeVisible();
    await expect(page.getByText('都道府県は何個でも出せるよ')).toBeVisible();
    await expect(page.getByRole('button', { name: '地図を拡大' })).toHaveCSS('touch-action', 'manipulation');
  }
});
