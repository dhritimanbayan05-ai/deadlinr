const fetch = require('node-fetch');

async function test() {
    console.log('Testing GET /api/data...');
    let res = await fetch('http://localhost:3000/api/data');
    let data = await res.json();
    console.log('Got data, users count:', data.users ? data.users.length : 'none');

    console.log('\nTesting POST /api/data without authUser (should allow)...');
    res = await fetch('http://localhost:3000/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    console.log('Status no authUser:', res.status, await res.json());

    console.log('\nTesting POST /api/data with authUser = "Prayash"...');
    // Modify Piyush's role
    const piyush = data.users.find(u => u.name === 'Piyush');
    if (piyush) piyush.role = 'Hacked';

    res = await fetch('http://localhost:3000/api/data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-user-name': 'Prayash'
        },
        body: JSON.stringify(data)
    });
    console.log('Status authUser Prayash:', res.status, await res.json());

    // Verify if Piyush was actually modified
    res = await fetch('http://localhost:3000/api/data');
    data = await res.json();
    const piyushAfter = data.users.find(u => u.name === 'Piyush');
    console.log('Piyush role after attempt (should NOT be Hacked):', piyushAfter ? piyushAfter.role : 'not found');

    console.log('\nTesting PATCH /api/data/user/Piyush with authUser = "Prayash" (should 403)...');
    res = await fetch('http://localhost:3000/api/data/user/Piyush', {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'x-user-name': 'Prayash'
        },
        body: JSON.stringify({ role: 'Hacked Again' })
    });
    console.log('Status PATCH foreign user:', res.status, await res.json());

    console.log('\nTesting PATCH /api/data/user/Piyush with authUser = "Piyush" (should ok)...');
    res = await fetch('http://localhost:3000/api/data/user/Piyush', {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'x-user-name': 'Piyush'
        },
        body: JSON.stringify({ role: 'Awesome Singer' })
    });
    console.log('Status PATCH own user:', res.status, await res.json());
}

test().catch(console.error);
