import Mailjet from "node-mailjet";
import { MAILJET_API_KEY, MAILJET_SECRET_KEY } from "../config";

const mailjet = Mailjet.apiConnect(MAILJET_API_KEY, MAILJET_SECRET_KEY);

export const sendEmail = ({
  toMail,
  username,
  subject,
  content,
}: {
  toMail: string;
  username: string;
  subject: string;
  content: string;
}) => {
  return (
    mailjet
      .post("send", { version: "v3.1" })
      .request({
        Messages: [
          {
            From: {
              Email: "harran39318@gmail.com",
              Name: "harry",
            },
            To: [
              {
                Email: toMail,
              },
            ],
            Subject: subject,
            TextPart: "Risking notification email",
            HTMLPart: `<div>
                        <p>Hi ${username}!</p> 
                        <p>${content}</p>
                        </div>
                      `,
            CustomID: "AppGettingStartedTest",
          },
        ],
      })
      // .request()
      .then((result: any) => {
        console.log(result.body);
      })
      .catch((err: any) => {
        console.log(err.statusCode);
        console.log(err.message);
      })
  );
};
