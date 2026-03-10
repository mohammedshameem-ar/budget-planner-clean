import webpush from 'web-push';

const publicVapidKey = 'BKBTBHQ3gY41vwxe5d5BAqEAGhMOrt9KKYO41-t8BW9gVWPOfH8WDnY0SVsx9hR03njGyiUeJ9DtgibOK8rZD5o';
const privateVapidKey = 'nDvL2JR4D8u8BnjmfIVEo5iRG1droFQ7cEQMCYwIulM';

try {
    webpush.setVapidDetails(
        'mailto:test@test.com',
        publicVapidKey,
        privateVapidKey
    );
    console.log('VAPID keys are valid!');
} catch (err) {
    console.error('VAPID keys are INVALID!');
    console.error(err);
}
