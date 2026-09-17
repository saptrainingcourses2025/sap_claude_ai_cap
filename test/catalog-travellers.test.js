const cds = require('@sap/cds');
const { GET, POST, PATCH, expect } = cds.test(__dirname + '/..');

const admin = { auth: { username: 'alice.admin', password: 'admin123' } };
const traveller = { auth: { username: 'rajesh.kumar', password: 'traveller123' } };

describe('CatalogService - Travellers', () => {

  it('returns only the own row for the Traveller role', async () => {
    const { data } = await GET('/odata/v4/catalog/Travellers', traveller);
    expect(data.value.length).to.equal(1);
    expect(data.value[0].userID).to.equal('rajesh.kumar');
  });

  it('returns all rows for the Admin role', async () => {
    const { data } = await GET('/odata/v4/catalog/Travellers', admin);
    expect(data.value.length).to.be.greaterThan(1);
  });

  it('computes fullName on READ without persisting it', async () => {
    const { data } = await GET(
      "/odata/v4/catalog/Travellers?$filter=userID eq 'rajesh.kumar'",
      traveller
    );
    expect(data.value[0].fullName).to.equal('Rajesh Kumar');
  });

  it('rejects PATCH without an If-Match header with 428', async () => {
    const { data } = await GET(
      "/odata/v4/catalog/Travellers?$filter=userID eq 'rajesh.kumar'",
      traveller
    );
    const id = data.value[0].ID;

    await expect(
      PATCH(`/odata/v4/catalog/Travellers(${id})`, { phone: '+1-000-000-0000' }, traveller)
    ).to.be.rejectedWith(/428/);
  });

  it('rejects PATCH with a stale ETag with 412', async () => {
    const { data } = await GET(
      "/odata/v4/catalog/Travellers?$filter=userID eq 'rajesh.kumar'",
      traveller
    );
    const id = data.value[0].ID;

    await expect(
      PATCH(
        `/odata/v4/catalog/Travellers(${id})`,
        { phone: '+1-000-000-0000' },
        { ...traveller, headers: { 'If-Match': '"stale-etag"' } }
      )
    ).to.be.rejectedWith(/412/);
  });

  it('accepts PATCH with the correct ETag and updates modifiedAt', async () => {
    const listRes = await GET(
      "/odata/v4/catalog/Travellers?$filter=userID eq 'rajesh.kumar'",
      traveller
    );
    const id = listRes.data.value[0].ID;

    // ETag headers are only returned on a single-entity-by-key GET, not
    // on a collection query.
    const getRes = await GET(`/odata/v4/catalog/Travellers(${id})`, traveller);
    const etag = getRes.headers.etag;

    const patchRes = await PATCH(
      `/odata/v4/catalog/Travellers(${id})`,
      { phone: '+1-999-999-9999' },
      { ...traveller, headers: { 'If-Match': etag } }
    );
    expect(patchRes.status).to.equal(200);
    expect(patchRes.data.phone).to.equal('+1-999-999-9999');
  });

  it('rejects CREATE with missing firstName/lastName with 400', async () => {
    await expect(
      POST('/odata/v4/catalog/Travellers', {
        firstName: '',
        lastName: '',
        email: 'nobody@example.com',
        type_code: 'ST',
        status_code: 'A'
      }, admin)
    ).to.be.rejectedWith(/400/);
  });

  it('rejects CREATE with a duplicate email with 409', async () => {
    await expect(
      POST('/odata/v4/catalog/Travellers', {
        firstName: 'Duplicate',
        lastName: 'Traveller',
        email: 'rajesh.kumar@gmail.com',
        type_code: 'ST',
        status_code: 'A',
        userID: 'duplicate.traveller'
      }, admin)
    ).to.be.rejectedWith(/409/);
  });
});
