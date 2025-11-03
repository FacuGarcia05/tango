import express, { Express } from 'express';
import bodyParser from 'body-parser';
// @ts-ignore
const soap = require('soap');

//logica del servicio SOAP
const service = {
  GameCurrencyService: {
    GameCurrencyServiceSoapPort: {
      convertPrice(args: {
        title: string;
        priceUSD: any;
        targetCurrency: string;
      }) {
        const price = parseFloat(args.priceUSD); // ← conversion
        const rates: Record<string, number> = { ARS: 1425, EUR: 0.92, BRL: 5.6 };
        const rate = rates[args.targetCurrency] || 1;
        const converted = price * rate;

        return {
          title: args.title,
          originalPrice: price.toFixed(2),
          targetCurrency: args.targetCurrency,
          convertedPrice: converted.toFixed(2),
          rate,
        };
      },
    },
  },
};

//contrato WSDL
const wsdl = `
<definitions name="GameCurrencyService"
             targetNamespace="http://tango.com/gamecurrency"
             xmlns="http://schemas.xmlsoap.org/wsdl/"
             xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"
             xmlns:tns="http://tango.com/gamecurrency"
             xmlns:xsd="http://www.w3.org/2001/XMLSchema">

  <message name="convertPriceRequest">
    <part name="title" type="xsd:string"/>
    <part name="priceUSD" type="xsd:float"/>
    <part name="targetCurrency" type="xsd:string"/>
  </message>

  <message name="convertPriceResponse">
    <part name="title" type="xsd:string"/>
    <part name="originalPrice" type="xsd:string"/>
    <part name="targetCurrency" type="xsd:string"/>
    <part name="convertedPrice" type="xsd:string"/>
    <part name="rate" type="xsd:float"/>
  </message>

  <portType name="GameCurrencyServicePortType">
    <operation name="convertPrice">
      <input message="tns:convertPriceRequest"/>
      <output message="tns:convertPriceResponse"/>
    </operation>
  </portType>

  <binding name="GameCurrencyServiceSoapBinding" type="tns:GameCurrencyServicePortType">
    <soap:binding style="rpc" transport="http://schemas.xmlsoap.org/soap/http"/>
    <operation name="convertPrice">
      <soap:operation soapAction="convertPrice"/>
      <input><soap:body use="literal" namespace="http://tango.com/gamecurrency"/></input>
      <output><soap:body use="literal" namespace="http://tango.com/gamecurrency"/></output>
    </operation>
  </binding>

  <service name="GameCurrencyService">
    <documentation>SOAP Service for converting game prices</documentation>
    <port name="GameCurrencyServiceSoapPort" binding="tns:GameCurrencyServiceSoapBinding">
      <soap:address location="http://localhost:8081/wsdl"/>
    </port>
  </service>
</definitions>
`;

// Inicializacion sevidor Express
export function startSoapServer() {
  const app = express();
  app.use(bodyParser.raw({ type: () => true, limit: '5mb' }));

  const port = 8081;
  soap.listen(app, '/wsdl', service, wsdl);
  app.listen(port, () =>
    console.log(`✅ SOAP Server running at http://localhost:${port}/wsdl?wsdl`),
  );
}
