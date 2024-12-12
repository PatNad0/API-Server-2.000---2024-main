import Model from "./model.js";
import Registration from "./registration.js";
import Repository from "./repository.js";
import Student from "./student.js";
export default class Like extends Model {
  constructor() {
    super(true /* secured Id */);

    this.addField("postId", "string");
    this.addField("ownerName", "string");
    this.addField("created", "integer");

    this.setKey("postId");
  }


}
