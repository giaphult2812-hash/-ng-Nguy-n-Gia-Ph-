import https from 'https';

https.get('https://tiengdong.com/am-thanh-tinh-tien-edit-video', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    const matches = data.match(/https:\/\/[^"']*\.mp3/g);
    if (matches) {
      console.log(matches);
    } else {
      console.log('No mp3 found');
    }
  });
}).on('error', (err) => {
  console.log('Error: ' + err.message);
});
