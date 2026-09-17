const cds = require('@sap/cds');
const { GET, POST, PATCH, DELETE, expect } = cds.test(__dirname + '/..');

const admin = { auth: { username: 'alice.admin', password: 'admin123' } };

describe('CatalogService - Destinations & value helps', () => {

  it('creates a destination with 201', async () => {
    const res = await POST('/odata/v4/catalog/Destinations', {
      name: 'Test City',
      country: 'Testland',
      city: 'Test City'
    }, admin);
    expect(res.status).to.equal(201);
  });

  it('rejects PATCH on Destinations with 405', async () => {
    const { data } = await GET('/odata/v4/catalog/Destinations?$top=1', admin);
    const id = data.value[0].ID;

    await expect(
      PATCH(`/odata/v4/catalog/Destinations(${id})`, { city: 'Changed' }, admin)
    ).to.be.rejectedWith(/405/);
  });

  it('rejects DELETE on Destinations with 405', async () => {
    const { data } = await GET('/odata/v4/catalog/Destinations?$top=1', admin);
    const id = data.value[0].ID;

    await expect(
      DELETE(`/odata/v4/catalog/Destinations(${id})`, admin)
    ).to.be.rejectedWith(/405/);
  });

  it('returns seeded TravellerStatus values', async () => {
    const { data } = await GET('/odata/v4/catalog/TravellerStatus', admin);
    expect(data.value.length).to.be.greaterThan(0);
  });

  it('returns seeded AddressTypes values', async () => {
    const { data } = await GET('/odata/v4/catalog/AddressTypes', admin);
    expect(data.value.length).to.be.greaterThan(0);
  });

  it('returns seeded TravellerTypes values with no write operations', async () => {
    const { data } = await GET('/odata/v4/catalog/TravellerTypes', admin);
    expect(data.value.length).to.equal(3);

    await expect(
      POST('/odata/v4/catalog/TravellerTypes', { code: 'XX', name: 'Extra' }, admin)
    ).to.be.rejectedWith(/405/);
  });
});
