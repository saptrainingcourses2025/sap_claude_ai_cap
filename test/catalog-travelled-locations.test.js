const cds = require('@sap/cds');
const { GET, POST, DELETE, expect } = cds.test(__dirname + '/..');

const admin = { auth: { username: 'alice.admin', password: 'admin123' } };
const traveller = { auth: { username: 'rajesh.kumar', password: 'traveller123' } };

const RAJESH_ID = 'a1b2c3d4-e5f6-4001-8001-ef1234560001';
const PARIS_ID = 'f1a2b3c4-d5e6-4501-9501-110000000001';
const TOKYO_ID = 'f1a2b3c4-d5e6-4501-9501-110000000002';

describe('CatalogService - TravelledLocations', () => {

  it('creates a non-overlapping location with 201', async () => {
    const res = await POST('/odata/v4/catalog/TravelledLocations', {
      traveller_ID: RAJESH_ID,
      destination_ID: TOKYO_ID,
      travelFrom: '2028-01-01',
      travelTo: '2028-01-10',
      notes: 'test trip'
    }, traveller);
    expect(res.status).to.equal(201);
  });

  it('rejects an overlapping date range with 409', async () => {
    await expect(
      POST('/odata/v4/catalog/TravelledLocations', {
        traveller_ID: RAJESH_ID,
        destination_ID: PARIS_ID,
        travelFrom: '2026-10-08',
        travelTo: '2026-10-09',
        notes: 'overlaps existing Paris trip'
      }, traveller)
    ).to.be.rejectedWith(/409/);
  });

  it('rejects travelFrom > travelTo with 400', async () => {
    await expect(
      POST('/odata/v4/catalog/TravelledLocations', {
        traveller_ID: RAJESH_ID,
        destination_ID: PARIS_ID,
        travelFrom: '2028-05-10',
        travelTo: '2028-05-01'
      }, traveller)
    ).to.be.rejectedWith(/400/);
  });

  it('deletes own record with 204', async () => {
    const created = await POST('/odata/v4/catalog/TravelledLocations', {
      traveller_ID: RAJESH_ID,
      destination_ID: TOKYO_ID,
      travelFrom: '2029-01-01',
      travelTo: '2029-01-05'
    }, traveller);

    const res = await DELETE(`/odata/v4/catalog/TravelledLocations(${created.data.ID})`, traveller);
    expect(res.status).to.equal(204);
  });

  it('returns 404 deleting another traveller\'s record', async () => {
    const { data } = await GET(
      "/odata/v4/catalog/TravelledLocations?$filter=notes eq 'Tokyo Cherry Blossom Trip — budget 6400.00 JPY.'",
      admin
    );
    const otherRecordId = data.value[0].ID;

    await expect(
      DELETE(`/odata/v4/catalog/TravelledLocations(${otherRecordId})`, traveller)
    ).to.be.rejectedWith(/404/);
  });

  it('expands destination inline', async () => {
    const { data } = await GET(
      '/odata/v4/catalog/TravelledLocations?$expand=destination&$top=1',
      admin
    );
    expect(data.value[0].destination).to.exist;
  });

  it('expands traveller with computed fullName', async () => {
    const { data } = await GET(
      "/odata/v4/catalog/TravelledLocations?$expand=traveller($select=firstName,lastName,fullName)&$top=1",
      admin
    );
    expect(data.value[0].traveller.fullName).to.exist;
  });
});
