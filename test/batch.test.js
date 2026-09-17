const cds = require('@sap/cds');
const { POST, expect } = cds.test(__dirname + '/..');

const admin = { auth: { username: 'alice.admin', password: 'admin123' } };

const PRIYA_ID = 'a1b2c3d4-e5f6-4002-8002-ef1234560002';
const PARIS_ID = 'f1a2b3c4-d5e6-4501-9501-110000000001';
const TOKYO_ID = 'f1a2b3c4-d5e6-4501-9501-110000000002';
const NEW_YORK_ID = 'f1a2b3c4-d5e6-4501-9501-110000000003';

describe('CatalogService - $batch', () => {

  it('commits all non-overlapping TravelledLocations in one batch', async () => {
    const res = await POST('/odata/v4/catalog/$batch', {
      requests: [
        { id: '1', method: 'POST', url: 'TravelledLocations', body: {
          traveller_ID: PRIYA_ID, destination_ID: PARIS_ID, travelFrom: '2030-01-01', travelTo: '2030-01-05'
        }, headers: { 'content-type': 'application/json' } },
        { id: '2', method: 'POST', url: 'TravelledLocations', body: {
          traveller_ID: PRIYA_ID, destination_ID: TOKYO_ID, travelFrom: '2030-02-01', travelTo: '2030-02-05'
        }, headers: { 'content-type': 'application/json' } },
        { id: '3', method: 'POST', url: 'TravelledLocations', body: {
          traveller_ID: PRIYA_ID, destination_ID: NEW_YORK_ID, travelFrom: '2030-03-01', travelTo: '2030-03-05'
        }, headers: { 'content-type': 'application/json' } }
      ]
    }, admin);

    expect(res.status).to.equal(200);
    const statuses = res.data.responses.map(r => r.status);
    expect(statuses).to.deep.equal([201, 201, 201]);
  });

  it('commits valid entries and rejects the overlapping one', async () => {
    const res = await POST('/odata/v4/catalog/$batch', {
      requests: [
        { id: '1', method: 'POST', url: 'TravelledLocations', body: {
          traveller_ID: PRIYA_ID, destination_ID: PARIS_ID, travelFrom: '2031-01-01', travelTo: '2031-01-05'
        }, headers: { 'content-type': 'application/json' } },
        { id: '2', method: 'POST', url: 'TravelledLocations', body: {
          traveller_ID: PRIYA_ID, destination_ID: PARIS_ID, travelFrom: '2031-01-03', travelTo: '2031-01-08'
        }, headers: { 'content-type': 'application/json' } }
      ]
    }, admin);

    const statuses = res.data.responses.map(r => r.status).sort();
    expect(statuses).to.deep.equal([201, 409]);
  });
});
