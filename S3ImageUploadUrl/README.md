
# Lambda + API Gateway + S3 Upload med Postman

## Syfte

I denna laboration ska ni:

- Skapa en Lambda-funktion i AWS
- Koppla Lambda till en HTTP API Gateway
- Generera en presigned URL för uppladdning till S3
- Ladda upp bilder direkt till S3 via Postman
- Förstå skillnaden mellan backend-anrop och själva filuppladdningen
- Träna på hur moderna enterprise-system laddar upp filer till S3

---

# Arkitektur

```text
Postman
   |
   | POST /upload-url
   v
API Gateway
   |
   v
Lambda (Node.js 22)
   |
   v
Genererar presigned URL
   |
   v
Returnerar uploadUrl

Postman
   |
   | PUT image.jpg till uploadUrl
   v
S3 Bucket
```

---

# Förkunskaper

Ni behöver:

- AWS-konto
- Behörighet att skapa:
  - Lambda
  - API Gateway
  - S3 bucket
  - IAM Roller
- Postman installerat
- Node.js installerat lokalt

---

# Projektstruktur

```text
project/
│
├── index.mjs
├── package.json
└── README.md
```

---

# package.json

```json
{
  "name": "s3-upload-url-lambda",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@aws-sdk/client-s3": "^3.821.0",
    "@aws-sdk/s3-request-presigner": "^3.821.0"
  }
}
```

---

# index.mjs

```javascript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
    region: "eu-north-1"
});

export const handler = async (event) => {

    try {

        const body = JSON.parse(event.body);

        const fileName = body.fileName;
        const contentType = body.contentType;

        const key = `uploads/${Date.now()}-${fileName}`;

        const command = new PutObjectCommand({
            Bucket: "YOUR_BUCKET_NAME",
            Key: key,
            ContentType: contentType
        });

        const uploadUrl = await getSignedUrl(
            s3Client,
            command,
            {
                expiresIn: 300
            }
        );

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                uploadUrl,
                key
            })
        };

    } catch (error) {

        console.error(error);

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Failed to generate upload URL",
                error: error.message
            })
        };
    }
};
```

---

# Steg 1 – Skapa S3 Bucket

1. Gå till AWS S3
2. Skapa en bucket
3. Välj region:

```text
EU (Stockholm) eu-north-1
```

4. Behåll bucket privat
5. Notera bucket-namnet

---

# Steg 2 – Skapa Lambda

1. Gå till AWS Lambda
2. Create function
3. Välj:

```text
Author from scratch
```

4. Runtime:

```text
Node.js 22.x
```

5. Ladda upp projektet som zip-fil

---

# Steg 3 – Installera dependencies lokalt

Kör:

```bash
npm install
```

Skapa zip:

```bash
zip -r function.zip .
```

Ladda upp zip-filen till Lambda.

---

# Steg 4 – IAM Permissions

Lambda behöver rättigheter att skriva till S3.

Lägg till följande policy på Lambda-rollen:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
    }
  ]
}
```

---

# Steg 5 – API Gateway

1. Skapa en HTTP API
2. Skapa route:

```text
POST /upload-url
```

3. Koppla route till Lambda
4. Deploy API

Ni får då en URL liknande:

```text
https://abc123.execute-api.eu-north-1.amazonaws.com/upload-url
```

---

# Steg 6 – Testa i Postman

## Request 1 – Generera upload URL

### Method

```http
POST
```

### URL

```text
https://YOUR_API/upload-url
```

### Body

Välj:

```text
raw -> JSON
```

### Body exempel

```json
{
  "fileName": "cat.jpg",
  "contentType": "image/jpeg"
}
```

---

# Svar från API

```json
{
  "uploadUrl": "https://...",
  "key": "uploads/1746473020-cat.jpg"
}
```

Kopiera endast värdet i:

```text
uploadUrl
```

---

# Request 2 – Ladda upp bild till S3

## Method

```http
PUT
```

## URL

Klistra in uploadUrl.

---

# Authorization

Välj:

```text
No Auth
```

---

# Headers

| Key | Value |
|---|---|
| Content-Type | image/jpeg |

---

# Body

Välj:

```text
binary
```

Välj sedan en bild från datorn.

---

# Förväntat resultat

```http
200 OK
```

Bilden ska nu finnas i er S3 bucket.

---

# Viktiga koncept

## Vad är en presigned URL?

En temporär URL som ger tillfällig rättighet att ladda upp en fil till S3.

Vanligt i enterprise-system eftersom:

- backend slipper hantera stora filer
- bättre skalbarhet
- billigare
- snabbare
- säkrare

---

# Varför används PUT istället för POST?

S3 använder operationen:

```text
PutObject
```

Det betyder:

```text
Lägg denna fil på denna plats i S3
```

PUT används därför för själva filuppladdningen.

POST används normalt för:

- skapa resurser
- formulär
- API-anrop

---

# Vanliga fel

## SignatureDoesNotMatch

Orsaker:

- fel HTTP-method
- fel Content-Type
- URL modifierad
- Postman använder auth
- för gammal URL

---

## AccessDenied

Lambda saknar IAM-rättigheter.

---

## Expired URL

Presigned URL har gått ut.

---

# Övningar

## Övning 1 – Grundläggande upload

Mål:

- Skapa bucket
- Skapa Lambda
- Skapa API Gateway
- Ladda upp en bild via Postman

Frågor:

1. Varför används PUT mot S3?
2. Varför används POST mot API Gateway?
3. Vad innehåller key-värdet?

---

# Övning 2 – Validera filtyp

Utöka Lambda så att endast bilder accepteras.

Krav:

- image/jpeg
- image/png

Om annan contentType skickas:

```json
{
  "message": "Only image uploads allowed"
}
```

---

# Övning 3 – Dynamiska mappar

Ändra key så att filer sparas per användare.

Exempel:

```text
users/123/profile-image.jpg
```

Diskutera:

- Hur skulle userId normalt hämtas i ett riktigt system?
- Varför används inte originalfilnamn direkt?

---

# Övning 4 – Kortare livstid på URL

Ändra:

```javascript
expiresIn: 300
```

Testa:

- 30 sekunder
- 10 sekunder

Vad händer när URL:en går ut?

---

# Övning 5 – Flera filtyper

Lägg till stöd för:

- PDF
- textfiler

Testa:

- application/pdf
- text/plain

Diskutera:

- Vilka säkerhetsrisker finns?
- Vad bör kontrolleras i backend?

---

# Övning 6 – Metadata

Utöka Lambda så att metadata skickas till S3.

Exempel:

```javascript
Metadata: {
    uploadedBy: "student"
}
```

Undersök sedan metadata i S3 Console.

---

# Övning 7 – Bildbucket för företagssystem

Scenario:

Ett företag har:

- React frontend
- Spring Boot backend
- S3 bucket
- Lambda-funktioner
- SQS köer

Beskriv:

1. Hur en profilbild laddas upp
2. Varför backend inte bör ta emot själva bildfilen
3. Vad som kan triggas efter uppladdning
4. Hur man kan skapa thumbnails automatiskt

---

# Övning 8 – Event-driven arkitektur

Undersök:

- S3 Event Notifications
- SQS
- Lambda triggers

Bygg ett flöde:

```text
S3 -> SQS -> Lambda
```

Lambda ska logga:

- bucket
- key
- filstorlek

---

# Övning 9 – Multipart Uploads

Undersök:

- Vad är multipart upload?
- När används det?
- Varför används det i enterprise-system?

Diskutera:

- stora videofiler
- återupptagning av uploads
- parallella uploads

---

# Övning 10 – Reflektion

Besvara:

1. Varför är presigned URLs populära i moderna system?
2. Vilka fördelar finns jämfört med att ladda upp filer via backend?
3. Hur skulle ni designa ett säkert filuppladdningssystem?
4. Vilka AWS-tjänster skulle ni använda i produktion?

---

# Extra Utmaningar

## Utmaning 1

Skapa en Lambda som genererar presigned GET URLs för nedladdning.

---

## Utmaning 2

Skapa thumbnails automatiskt när en bild laddas upp.

Tips:

```text
S3 -> Lambda Trigger
```

---

## Utmaning 3

Lägg till filstorleksbegränsning.

Exempel:

```text
Max 5 MB
```

---

## Utmaning 4

Skapa separata buckets för:

- dev
- test
- prod

Diskutera:

- naming conventions
- säkerhet
- IAM-strategi

---

# Sammanfattning

Ni har nu arbetat med:

- AWS Lambda
- API Gateway
- S3
- Presigned URLs
- Postman
- IAM
- Enterprise upload patterns
- Event-driven arkitektur

Detta är en mycket vanlig lösning i moderna molnbaserade system.

