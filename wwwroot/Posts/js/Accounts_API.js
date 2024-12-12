class Accounts_API {
  static Host_URL() {
    return "http://localhost:5000";
  }
  static ACCOUNTS_API_URL() {
    return this.Host_URL() + "/accounts";
  }

  static async HEAD() {
    Accounts_API.initHttpState();
    return new Promise((resolve) => {
      $.ajax({
        url: this.ACCOUNTS_API_URL(),
        type: "HEAD",
        contentType: "text/plain",
        complete: (data) => {
          resolve(data.getResponseHeader("ETag"));
        },
        error: (xhr) => {
          Posts_API.setHttpErrorState(xhr);
          resolve(null);
        },
      });
    });
  }

  //homebrewed
  static async register(user) {
    Accounts_API.initHttpState();
    return new Promise((resolve) => {
      $.ajax({
        url: this.ACCOUNTS_API_URL() + "/register",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify(user),
        success: (data) => resolve(data),
        error: (xhr) => {
          Accounts_API.setHttpErrorState(xhr);
          resolve(null);
        },
      });
    });
  }
  static async sendVerificationEmail(user) {
    Accounts_API.initHttpState();
    return new Promise((resolve) => {
      $.ajax({
        url: `${this.ACCOUNTS_API_URL()} + /sendVerificationEmail`,
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify(user),
        success: (data) => resolve(data),
        error: (xhr) => {
          Accounts_API.setHttpErrorState(xhr);
          resolve(null);
        },
      });
    });
  }
  //homebrewed
  static async verify(id, code) {
    Accounts_API.initHttpState();
    return new Promise((resolve) => {
      $.ajax({
        url: `${this.ACCOUNTS_API_URL()}/verify?id=${id}&code=${code}`,
        type: "GET",
        success: (data) => resolve(data),
        error: (xhr) => {
          Accounts_API.setHttpErrorState(xhr);
          resolve(null);
        },
      });
    });
  }
  //homebrewed
  static async login(email, password) {
    Accounts_API.initHttpState();

    return new Promise((resolve) => {
      $.ajax({
        url: `${this.Host_URL()}/token`,
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({ Email: email, Password: password }),
        success: (data) => resolve(data),
        error: (xhr) => {
          Accounts_API.setHttpErrorState(xhr);
          resolve(null);
        },
      });
    });
  }

  static async logout(userId) {
    Accounts_API.initHttpState();
    return new Promise((resolve) => {
      $.ajax({
        url: `${this.ACCOUNTS_API_URL()}/logout?userId=${userId}`,
        type: "GET",
        success: () => resolve(true),
        error: (xhr) => {
          Accounts_API.setHttpErrorState(xhr);
          resolve(false);
        },
      });
    });
  }
  static async promote(user) {
    Accounts_API.initHttpState();
    return new Promise((resolve) => {
      $.ajax({
        url: this.ACCOUNTS_API_URL() + "/promote",
        type: "PUT",
        contentType: "application/json",
        data: JSON.stringify(user),
        success: (data) => resolve(data),
        error: (xhr) => {
          Accounts_API.setHttpErrorState(xhr);
          resolve(null);
        },
      });
    });
  }
  static async block(user) {
    Accounts_API.initHttpState();
    return new Promise((resolve) => {
      $.ajax({
        url: this.ACCOUNTS_API_URL() + "/block",
        type: "PUT",
        contentType: "application/json",
        data: JSON.stringify(user),
        success: (data) => resolve(data),
        error: (xhr) => {
          Accounts_API.setHttpErrorState(xhr);
          resolve(null);
        },
      });
    });
  }
  static async Save(data, bearerToken, create = true) {
    Accounts_API.initHttpState();
    console.log("Access token:", bearerToken); 
    return new Promise((resolve) => {
      $.ajax({
        url: create
          ? this.ACCOUNTS_API_URL()
          : this.Host_URL() + "/accounts" + "/modify",
        type: create ? "POST" : "PUT",
        contentType: "application/json",
        headers: { authorization: 'Bearer' + bearerToken },
        data: JSON.stringify(data),
        success: (data) => resolve(data),
        error: (xhr) => {
          console.error("Error:", xhr); // Debugging line
          Accounts_API.setHttpErrorState(xhr);
          resolve(null);
        },
      });
    });
  }
  static async Get(id = null) {
    Accounts_API.initHttpState();
    return new Promise((resolve) => {
      $.ajax({
        url: this.ACCOUNTS_API_URL() + (id != null ? "/" + id : ""),
        complete: (data) => {
          resolve({
            ETag: data.getResponseHeader("ETag"),
            data: data.responseJSON,
          });
        },
        error: (xhr) => {
          Accounts_API.setHttpErrorState(xhr);
          resolve(null);
        },
      });
    });
  }
  static async Delete(id) {
    return new Promise((resolve) => {
      $.ajax({
        url: this.ACCOUNTS_API_URL() + "/" + id,
        type: "DELETE",
        success: () => {
          Accounts_API.initHttpState();
          resolve(true);
        },
        error: (xhr) => {
          Accounts_API.setHttpErrorState(xhr);
          resolve(null);
        },
      });
    });
  }

  static initHttpState() {
    this.currentHttpError = "";
    this.currentStatus = 0;
    this.error = false;
  }
  static setHttpErrorState(xhr) {
    if (xhr.responseJSON)
      this.currentHttpError = xhr.responseJSON.error_description;
    else
      this.currentHttpError =
        xhr.statusText == "error" ? "Service introuvable" : xhr.statusText;
    this.currentStatus = xhr.status;
    this.error = true;
  }
  static async HEAD() {
    Accounts_API.initHttpState();
    return new Promise((resolve) => {
      $.ajax({
        url: this.ACCOUNTS_API_URL(),
        type: "HEAD",
        contentType: "text/plain",
        complete: (data) => {
          resolve(data.getResponseHeader("ETag"));
        },
        error: (xhr) => {
          Accounts_API.setHttpErrorState(xhr);
          resolve(null);
        },
      });
    });
  }
  static async Get(id = null) {
    Accounts_API.initHttpState();
    return new Promise((resolve) => {
      $.ajax({
        url: this.ACCOUNTS_API_URL() + (id != null ? "/" + id : ""),
        complete: (data) => {
          resolve({
            ETag: data.getResponseHeader("ETag"),
            data: data.responseJSON,
          });
        },
        error: (xhr) => {
          Accounts_API.setHttpErrorState(xhr);
          resolve(null);
        },
      });
    });
  }
  static async GetQuery(queryString = "") {
    Accounts_API.initHttpState();
    return new Promise((resolve) => {
      $.ajax({
        url: this.ACCOUNTS_API_URL() + queryString,
        complete: (data) => {
          resolve({
            ETag: data.getResponseHeader("ETag"),
            data: data.responseJSON,
          });
        },
        error: (xhr) => {
          Accounts_API.setHttpErrorState(xhr);
          resolve(null);
        },
      });
    });
  }
  static async Delete(id) {
    return new Promise((resolve) => {
      $.ajax({
        url: this.ACCOUNTS_API_URL() + "/" + id,
        type: "DELETE",
        success: () => {
          Accounts_API.initHttpState();
          resolve(true);
        },
        error: (xhr) => {
          Accounts_API.setHttpErrorState(xhr);
          resolve(null);
        },
      });
    });
  }
}
