import mongoose from "mongoose";

const ContactSchema = new mongoose.Schema({
  email: String,
  name: String,
  summary: String,
});

const Contact = mongoose.model("contact", ContactSchema);

export default Contact;
