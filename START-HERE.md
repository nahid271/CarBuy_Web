# CarBuy 9.4 Dealers — shareable source package

This package includes the 9.4 dealer module and its 9.2 vehicle-data and 9.3 listings dependencies. Start with [dealers/README.md](dealers/README.md) for the DLR-01–DLR-12 feature map, setup, testing, and production integration notes.

Quick start with Node.js 22.18+:

```sh
cd vehicle-data && npm install
cd ../listings && npm install
cd ../dealers && npm install
npm run demo
```

Visit `http://127.0.0.1:4174/` on the same computer. The sample showroom and payment flow are local simulations. Do not submit real identity or payment information.
