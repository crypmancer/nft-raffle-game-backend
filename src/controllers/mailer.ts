import Mailjet from "node-mailjet";
import { MAILJET_API_KEY, MAILJET_SECRET_KEY } from "../config";

const mailjet = Mailjet.apiConnect(MAILJET_API_KEY, MAILJET_SECRET_KEY);

export const sendEmail = ({
  toMail,
  username,
  subject,
  content,
  register
}: {
  toMail: string;
  username: string;
  subject: string;
  content: string;
  register?: boolean;
}) => {
  console.log("to email ==>", toMail);
  return (
    mailjet
      .post("send", { version: "v3.1" })
      .request({
        Messages: [
          {
            From: {
              Email: "founder@risking.io",
              Name: "Risking.io",
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
                        ${!register ? `<p><a href='http://localhost:8000/api/user/unsubscribe/${toMail}'>Unsubscribe</a></p>`:''}
                        </div>
                      `,
            CustomID: "AppGettingStartedTest"
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
