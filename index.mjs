import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
    region: "eu-north-1"
});

export const handler = async (event) => {
    try {

        const fileName =
            event.queryStringParameters?.fileName || "image.jpg";

        const contentType =
            event.queryStringParameters?.contentType || "image/jpeg";

        const key = `uploads/${Date.now()}-${fileName}`;

        const command = new PutObjectCommand({
            Bucket: "YOUR_BUCKET_NAME",
            Key: key,
            ContentType: contentType
        });

        const signedUrl = await getSignedUrl(
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
                uploadUrl: signedUrl,
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