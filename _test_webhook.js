async function test() {
   const payload = {
      event: "messages.upsert",
      data: {
         key: {
            remoteJid: "5511999999999@s.whatsapp.net",
            fromMe: false,
            id: "test_msg_1"
         },
         message: {
            conversation: "VAN 1"
         }
      }
   };
   
   try {
      console.log('Sending VAN 1...');
      let res = await fetch('http://127.0.0.1:3000/webhook', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(payload)
      });
      console.log('Response:', await res.json());

      setTimeout(async () => {
         console.log('Sending Arthur...');
         payload.data.key.id = "test_msg_2";
         payload.data.message.conversation = "Arthur";
         res = await fetch('http://127.0.0.1:3000/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
         });
         console.log('Response:', await res.json());
      }, 2000);
   } catch (e) {
      console.error(e.message);
   }
}

test();
