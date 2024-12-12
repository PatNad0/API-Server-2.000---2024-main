////// Author: Nicolas Chourot
////// 2024
//////////////////////////////

const periodicRefreshPeriod = 2;
const waitingGifTrigger = 2000;
const minKeywordLenth = 3;
const keywordsOnchangeDelay = 500;

let categories = [];
let selectedCategory = "";
let currentETag = "";
let currentPostsCount = -1;
let periodic_Refresh_paused = false;
let postsPanel;
let itemLayout;
let waiting = null;
let showKeywords = false;
let keywordsOnchangeTimger = null;
let user = null;
Init_UI();
async function Init_UI() {
  postsPanel = new PageManager(
    "postsScrollPanel",
    "postsPanel",
    "postSample",
    renderPosts
  );
  $("#createPost").on("click", async function () {
    showCreatePostForm();
  });
  $("#abort").on("click", async function () {
    showPosts();
  });
  $("#aboutCmd").on("click", function () {
    showAbout();
  });
  $("#showSearch").on("click", function () {
    toogleShowKeywords();
    showPosts();
  });
  $("#signUpCmd").on("click", function () {
    showSignUpForm();
  });
  installKeywordsOnkeyupEvent();
  await showPosts();
  start_Periodic_Refresh();
}

/////////////////////////// Search keywords UI //////////////////////////////////////////////////////////

function installKeywordsOnkeyupEvent() {
  $("#searchKeys").on("keyup", function () {
    clearTimeout(keywordsOnchangeTimger);
    keywordsOnchangeTimger = setTimeout(() => {
      cleanSearchKeywords();
      showPosts(true);
    }, keywordsOnchangeDelay);
  });
  $("#searchKeys").on("search", function () {
    showPosts(true);
  });
}
function cleanSearchKeywords() {
  /* Keep only keywords of 3 characters or more */
  let keywords = $("#searchKeys").val().trim().split(" ");
  let cleanedKeywords = "";
  keywords.forEach((keyword) => {
    if (keyword.length >= minKeywordLenth) cleanedKeywords += keyword + " ";
  });
  $("#searchKeys").val(cleanedKeywords.trim());
}
function showSearchIcon() {
  $("#hiddenIcon").hide();
  $("#showSearch").show();
  if (showKeywords) {
    $("#searchKeys").show();
  } else $("#searchKeys").hide();
}
function hideSearchIcon() {
  $("#hiddenIcon").show();
  $("#showSearch").hide();
  $("#searchKeys").hide();
}
function toogleShowKeywords() {
  showKeywords = !showKeywords;
  if (showKeywords) {
    $("#searchKeys").show();
    $("#searchKeys").focus();
  } else {
    $("#searchKeys").hide();
    showPosts(true);
  }
}

/////////////////////////// Views management ////////////////////////////////////////////////////////////

function intialView() {
  $("#createPost").show();
  $("#hiddenIcon").hide();
  $("#hiddenIcon2").hide();
  $("#menu").show();
  $("#commit").hide();
  $("#abort").hide();
  $("#form").hide();
  $("#form").empty();
  $("#aboutContainer").hide();
  $("#errorContainer").hide();
  showSearchIcon();
}
async function showPosts(reset = false) {
  user = getSessionData();
  if (user != null && user.User.VerifyCode != "verified") {
    console.log("Bienvenu mon cher " + user.User.VerifyCode);
    showVerificationForm(user);
  }
  else{
  intialView();
  $("#viewTitle").text("Fil de nouvelles");
  periodic_Refresh_paused = false;
  await postsPanel.show(reset);
  }
}
function hidePosts() {
  postsPanel.hide();
  hideSearchIcon();
  $("#createPost").hide();
  $("#menu").hide();
  periodic_Refresh_paused = true;
}
function showForm() {
  hidePosts();
  $("#form").show();
  $("#commit").show();
  $("#abort").show();
}
function showError(message, details = "") {
  hidePosts();
  $("#form").hide();
  $("#form").empty();
  $("#hiddenIcon").show();
  $("#hiddenIcon2").show();
  $("#commit").hide();
  $("#abort").show();
  $("#viewTitle").text("Erreur du serveur...");
  $("#errorContainer").show();
  $("#errorContainer").empty();
  $("#errorContainer").append($(`<div>${message}</div>`));
  $("#errorContainer").append($(`<div>${details}</div>`));
}

function showCreatePostForm() {
  showForm();
  $("#viewTitle").text("Ajout de nouvelle");
  renderPostForm();
}
function showEditPostForm(id) {
  showForm();
  $("#viewTitle").text("Modification");
  renderEditPostForm(id);
}
function showDeletePostForm(id) {
  showForm();
  $("#viewTitle").text("Retrait");
  renderDeletePostForm(id);
}
function showAbout() {
  hidePosts();
  $("#hiddenIcon").show();
  $("#hiddenIcon2").show();
  $("#abort").show();
  $("#viewTitle").text("À propos...");
  $("#aboutContainer").show();
}
function showSignInForm() {
  showForm();
  $("#viewTitle").text("Inscription");
  renderSignInForm();
}
function showSignUpForm(create = true) {
  showForm();
  $("#viewTitle").text("Inscription");
  renderSignUpForm(create ? null : getSessionData().User);
}
function showVerificationForm() {
  showForm();
  $("#viewTitle").text("Code de vérification");
  renderVerificationForm();
}
//////////////////////////// Posts rendering /////////////////////////////////////////////////////////////

//////////////////////////// Posts rendering /////////////////////////////////////////////////////////////

function start_Periodic_Refresh() {
  $("#reloadPosts").addClass("white");
  $("#reloadPosts").on("click", async function () {
    $("#reloadPosts").addClass("white");
    postsPanel.resetScrollPosition();
    await showPosts();
  });
  setInterval(async () => {
    if (!periodic_Refresh_paused) {
      let etag = await Posts_API.HEAD();
      // the etag contain the number of model records in the following form
      // xxx-etag
      let postsCount = parseInt(etag.split("-")[0]);
      if (currentETag != etag) {
        if (postsCount != currentPostsCount) {
          console.log("postsCount", postsCount);
          currentPostsCount = postsCount;
          $("#reloadPosts").removeClass("white");
        } else await showPosts();
        currentETag = etag;
      }
    }
  }, periodicRefreshPeriod * 1000);
}
async function renderPosts(queryString) {
  let endOfData = false;
  queryString += "&sort=date,desc";
  compileCategories();
  if (selectedCategory != "") queryString += "&category=" + selectedCategory;
  if (showKeywords) {
    let keys = $("#searchKeys").val().replace(/[ ]/g, ",");
    if (keys !== "")
      queryString += "&keywords=" + $("#searchKeys").val().replace(/[ ]/g, ",");
  }
  addWaitingGif();
  let response = await Posts_API.GetQuery(queryString);
  if (!Posts_API.error) {
    currentETag = response.ETag;
    currentPostsCount = parseInt(currentETag.split("-")[0]);
    let Posts = response.data;
    if (Posts.length > 0) {
      Posts.forEach((Post) => {
        postsPanel.append(renderPost(Post));
      });
    } else endOfData = true;
    linefeeds_to_Html_br(".postText");
    highlightKeywords();
    attach_Posts_UI_Events_Callback();
  } else {
    showError(Posts_API.currentHttpError);
  }
  removeWaitingGif();
  return endOfData;
}
function renderPost(post, loggedUser) {
  let crudIcon = "";
  console.log("user", user);  
  if(user != null && user.User.Authorizations.readAccess >= 2 && user.User.Authorizations.writeAccess >= 2){
  crudIcon = `
        <span class="editCmd cmdIconSmall fa fa-pencil" postId="${post.Id}" title="Modifier nouvelle"></span>
        <span class="deleteCmd cmdIconSmall fa fa-trash" postId="${post.Id}" title="Effacer nouvelle"></span>
        `;
  }
  let date = convertToFrenchDate(UTC_To_Local(post.Date));
  return $(`
        <div class="post" id="${post.Id}">
            <div class="postHeader">
                ${post.Category}
                ${crudIcon}
            </div>
            <div class="postTitle"> ${post.Title} </div>
            <img class="postImage" src='${post.Image}'/>
            <div class="postDate"> ${date} </div>
            <div postId="${post.Id}" class="postTextContainer hideExtra">
                <div class="postText" >${post.Text}</div>
            </div>
            <div class="postfooter">
                <span postId="${post.Id}" class="moreText cmdIconXSmall fa fa-angle-double-down" title="Afficher la suite"></span>
                <span postId="${post.Id}" class="lessText cmdIconXSmall fa fa-angle-double-up" title="Réduire..."></span>
            </div>         
        </div>
    `);
}
async function compileCategories() {
  categories = [];
  let response = await Posts_API.GetQuery("?fields=category&sort=category");
  if (!Posts_API.error) {
    let items = response.data;
    if (items != null) {
      items.forEach((item) => {
        if (!categories.includes(item.Category)) categories.push(item.Category);
      });
      if (!categories.includes(selectedCategory)) selectedCategory = "";
      updateDropDownMenu(categories);
    }
  }
}
function updateDropDownMenu() {
  let DDMenu = $("#DDMenu");
  let logInfo = getSessionData();
  let isLogged = logInfo != null;
  console.log("isLogged", isLogged);
  if (isLogged) {
    console.log("Bienvenu mon cher " + logInfo.User.Name);
  }
  connectedMenu = isLogged
    ? `
    <div class="ownerLayout" id="signUpCmd">
    <img class="UserAvatarXSmall" src="${logInfo.User.Avatar}" />
    <div class="ownerName">${logInfo.User.Name}</div>
    </div>
    <div class="dropdown-item menuItemLayout" id="editProfilCmd"> <i class="menuIcon fa fa fa-user mx-2"></i> Modifier votre profil... </div>
    <div class="dropdown-item menuItemLayout" id="logOutCmd"> <i class="menuIcon fa fa-sign-out mx-2"></i> Déconnexion</div>`
    : `<div class="dropdown-item menuItemLayout" id="signInCmd"> <i class="menuIcon fa fa-sign-in mx-2"></i> Se connecté... </div>
    <div class="dropdown-item menuItemLayout" id="signUpCmd"> <i class="menuIcon fa fa fa-plus mx-2"></i> Inscription... </div>`;
  let selectClass = selectedCategory === "" ? "fa-check" : "fa-fw";
  DDMenu.empty();
  DDMenu.append($(connectedMenu));
  DDMenu.append($(`<div class="dropdown-divider"></div>`));
  DDMenu.append(
    $(`
        <div class="dropdown-item menuItemLayout" id="allCatCmd">
            <i class="menuIcon fa ${selectClass} mx-2"></i> Toutes les catégories
        </div>
        `)
  );
  DDMenu.append($(`<div class="dropdown-divider"></div>`));
  categories.forEach((category) => {
    selectClass = selectedCategory === category ? "fa-check" : "fa-fw";
    DDMenu.append(
      $(`
            <div class="dropdown-item menuItemLayout category" id="allCatCmd">
                <i class="menuIcon fa ${selectClass} mx-2"></i> ${category}
            </div>
        `)
    );
  });
  DDMenu.append($(`<div class="dropdown-divider"></div> `));
  DDMenu.append(
    $(`
        <div class="dropdown-item menuItemLayout" id="aboutCmd">
            <i class="menuIcon fa fa-info-circle mx-2"></i> À propos...
        </div>
        `)
  );

  $("#aboutCmd").on("click", function () {
    showAbout();
  });
  $("#signInCmd").on("click", function () {
    showSignInForm();
  });
  $("#signUpCmd").on("click", function () {
    showSignUpForm();
  });
  $("#logOutCmd").on("click", function () {
    LogOut();
  });
    $("#editProfilCmd").on("click", function () {
      showSignUpForm(false);
    });
  $("#allCatCmd").on("click", async function () {
    selectedCategory = "";
    await showPosts(true);
    updateDropDownMenu();
  });
  $(".category").on("click", async function () {
    selectedCategory = $(this).text().trim();
    await showPosts(true);
    updateDropDownMenu();
  });
}
function attach_Posts_UI_Events_Callback() {
  linefeeds_to_Html_br(".postText");
  // attach icon command click event callback
  $(".editCmd").off();
  $(".editCmd").on("click", function () {
    showEditPostForm($(this).attr("postId"));
  });
  $(".deleteCmd").off();
  $(".deleteCmd").on("click", function () {
    showDeletePostForm($(this).attr("postId"));
  });
  $(".moreText").off();
  $(".moreText").click(function () {
    $(`.commentsPanel[postId=${$(this).attr("postId")}]`).show();
    $(`.lessText[postId=${$(this).attr("postId")}]`).show();
    $(this).hide();
    $(`.postTextContainer[postId=${$(this).attr("postId")}]`).addClass(
      "showExtra"
    );
    $(`.postTextContainer[postId=${$(this).attr("postId")}]`).removeClass(
      "hideExtra"
    );
  });
  $(".lessText").off();
  $(".lessText").click(function () {
    $(`.commentsPanel[postId=${$(this).attr("postId")}]`).hide();
    $(`.moreText[postId=${$(this).attr("postId")}]`).show();
    $(this).hide();
    postsPanel.scrollToElem($(this).attr("postId"));
    $(`.postTextContainer[postId=${$(this).attr("postId")}]`).addClass(
      "hideExtra"
    );
    $(`.postTextContainer[postId=${$(this).attr("postId")}]`).removeClass(
      "showExtra"
    );
  });
}
function addWaitingGif() {
  clearTimeout(waiting);
  waiting = setTimeout(() => {
    postsPanel.itemsPanel.append(
      $(
        "<div id='waitingGif' class='waitingGifcontainer'><img class='waitingGif' src='Loading_icon.gif' /></div>'"
      )
    );
  }, waitingGifTrigger);
}
function removeWaitingGif() {
  clearTimeout(waiting);
  $("#waitingGif").remove();
}

/////////////////////// Posts content manipulation ///////////////////////////////////////////////////////

function linefeeds_to_Html_br(selector) {
  $.each($(selector), function () {
    let postText = $(this);
    var str = postText.html();
    var regex = /[\r\n]/g;
    postText.html(str.replace(regex, "<br>"));
  });
}
function highlight(text, elem) {
  text = text.trim();
  if (text.length >= minKeywordLenth) {
    var innerHTML = elem.innerHTML;
    let startIndex = 0;

    while (startIndex < innerHTML.length) {
      var normalizedHtml = innerHTML
        .toLocaleLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      var index = normalizedHtml.indexOf(text, startIndex);
      let highLightedText = "";
      if (index >= startIndex) {
        highLightedText =
          "<span class='highlight'>" +
          innerHTML.substring(index, index + text.length) +
          "</span>";
        innerHTML =
          innerHTML.substring(0, index) +
          highLightedText +
          innerHTML.substring(index + text.length);
        startIndex = index + highLightedText.length + 1;
      } else startIndex = innerHTML.length + 1;
    }
    elem.innerHTML = innerHTML;
  }
}
function highlightKeywords() {
  if (showKeywords) {
    let keywords = $("#searchKeys").val().split(" ");
    if (keywords.length > 0) {
      keywords.forEach((key) => {
        let titles = document.getElementsByClassName("postTitle");
        Array.from(titles).forEach((title) => {
          highlight(key, title);
        });
        let texts = document.getElementsByClassName("postText");
        Array.from(texts).forEach((text) => {
          highlight(key, text);
        });
      });
    }
  }
}

//////////////////////// Forms rendering /////////////////////////////////////////////////////////////////

async function renderEditPostForm(id) {
  $("#commit").show();
  addWaitingGif();
  let response = await Posts_API.Get(id);
  if (!Posts_API.error) {
    let Post = response.data;
    if (Post !== null) renderPostForm(Post);
    else showError("Post introuvable!");
  } else {
    showError(Posts_API.currentHttpError);
  }
  removeWaitingGif();
}
async function renderDeletePostForm(id) {
  let response = await Posts_API.Get(id);
  if (!Posts_API.error) {
    let post = response.data;
    if (post !== null) {
      let date = convertToFrenchDate(UTC_To_Local(post.Date));
      $("#form").append(`
                <div class="post" id="${post.Id}">
                <div class="postHeader">  ${post.Category} </div>
                <div class="postTitle ellipsis"> ${post.Title} </div>
                <img class="postImage" src='${post.Image}'/>
                <div class="postDate"> ${date} </div>
                <div class="postTextContainer showExtra">
                    <div class="postText">${post.Text}</div>
                </div>
            `);
      linefeeds_to_Html_br(".postText");
      // attach form buttons click event callback
      $("#commit").on("click", async function () {
        await Posts_API.Delete(post.Id);
        if (!Posts_API.error) {
          await showPosts();
        } else {
          console.log(Posts_API.currentHttpError);
          showError("Une erreur est survenue!");
        }
      });
      $("#cancel").on("click", async function () {
        await showPosts();
      });
    } else {
      showError("Post introuvable!");
    }
  } else showError(Posts_API.currentHttpError);
}
function newPost() {
  let Post = {};
  Post.Id = 0;
  Post.Title = "";
  Post.Text = "";
  Post.Image = "news-logo-upload.png";
  Post.Category = "";
  return Post;
}
function newAccount() {
  let Account = {};
  Account.Id = 0;
  Account.Name = "";
  Account.Email = "";
  Account.Password = "";
  Account.Avatar = "news-logo-upload.png";
  Account.Created = "";
  Account.VerifyCode = "";
  Account.Authorizations = "";
  return Account;
}
function renderPostForm(post = null) {
  let create = post == null;
  if (create) post = newPost();
  $("#form").show();
  $("#form").empty();
  $("#form").append(`
        <form class="form" id="postForm">
            <input type="hidden" name="Id" value="${post.Id}"/>
             <input type="hidden" name="Date" value="${post.Date}"/>
            <label for="Category" class="form-label">Catégorie </label>
            <input 
                class="form-control"
                name="Category"
                id="Category"
                placeholder="Catégorie"
                required
                value="${post.Category}"
            />
            <label for="Title" class="form-label">Titre </label>
            <input 
                class="form-control"
                name="Title" 
                id="Title" 
                placeholder="Titre"
                required
                RequireMessage="Veuillez entrer un titre"
                InvalidMessage="Le titre comporte un caractère illégal"
                value="${post.Title}"
            />
            <label for="Url" class="form-label">Texte</label>
             <textarea class="form-control" 
                          name="Text" 
                          id="Text"
                          placeholder="Texte" 
                          rows="9"
                          required 
                          RequireMessage = 'Veuillez entrer une Description'>${post.Text}</textarea>

            <label class="form-label">Image </label>
            <div class='imageUploaderContainer'>
                <div class='imageUploader' 
                     newImage='${create}' 
                     controlId='Image' 
                     imageSrc='${post.Image}' 
                     waitingImage="Loading_icon.gif">
                </div>
            </div>
            <div id="keepDateControl">
                <input type="checkbox" name="keepDate" id="keepDate" class="checkbox" checked>
                <label for="keepDate"> Conserver la date de création </label>
            </div>
            <input type="submit" value="Enregistrer" id="savePost" class="btn btn-primary displayNone">
        </form>
    `);
  if (create) $("#keepDateControl").hide();

  initImageUploaders();
  initFormValidation(); // important do to after all html injection!

  $("#commit").click(function () {
    $("#commit").off();
    return $("#savePost").trigger("click");
  });
  $("#postForm").on("submit", async function (event) {
    event.preventDefault();
    let post = getFormData($("#postForm"));
    if (post.Category != selectedCategory) selectedCategory = "";
    if (create || !("keepDate" in post)) post.Date = Local_to_UTC(Date.now());
    delete post.keepDate;
    post = await Posts_API.Save(post, create);
    if (!Posts_API.error) {
      await showPosts();
      postsPanel.scrollToElem(post.Id);
    } else showError("Une erreur est survenue! ", Posts_API.currentHttpError);
  });
  $("#cancel").on("click", async function () {
    await showPosts();
  });
}
function getFormData($form) {
  // prevent html injections
  const removeTag = new RegExp("(<[a-zA-Z0-9]+>)|(</[a-zA-Z0-9]+>)", "g");
  var jsonObject = {};
  // grab data from all controls
  $.each($form.serializeArray(), (index, control) => {
    jsonObject[control.name] = control.value.replace(removeTag, "");
  });
  return jsonObject;
}
function renderSignUpForm(account = null) {
  let create = account == null;
  if (create) account = newAccount();
  $("#form").show();
  $("#form").empty();
  // look up for courriel confirm and password confirm
  // change for edit, we should show the password
  $("#form").append(`
        <form class="form" id="accountForm">
            <input type="hidden" id="Id" name="Id" value="${account.Id}"/>
            <input type="hidden" id="date" name="Date" value="${
              account.Created
            }"/>
            <label for="Email" class="form-label">Adresse de courriel </label>
            <input 
                class="form-control accountForm"
                name="Email"
                id="Email"
                type="text"
                placeholder="Adresse courriel"
                required
                RequireMessage="Veuillez entrer une adresse courriel"
                CustomErrorMessage ="Ce courriel est déjà utilisé"
                value="${account.Email || ""}"
            />
            <input 
                class="form-control accountForm MatchedInput"
                        name="matchedEmail" 
                        id="matchedEmail" 
                        matchedInputId="Email"
                type="text"
                placeholder="Confirmation"
                required
                RequireMessage="Veuillez confirmer votre adresse courriel"
                InvalidMessage="Les courriels ne correspondent pas"
                value="${account.Email || ""}"
            />
            <label for="Password" class="form-label">Mot de passe</label>
            <input 
                class="form-control accountForm"
                name="Password"
                type="password"
                id="Password"
                placeholder="Mot de passe"
                required
                RequireMessage="Veuillez entrer un mot de passe"
                value="${"password"}"
            />
            <input 
                class="form-control accountForm MatchedInput"
                name="PasswordConfirm"
                        name="matchedPassword" 
                        id="matchedPassword" 
                        type="password"
                placeholder="Confirmation"
                matchedInputId="Password"
                required
                RequireMessage="Veuillez confirmer votre mot de passe"
                InvalidMessage="Ne correspond pas au mot de passe"
                value="${"password"}"
            />
            
            <label for="Nom" class="form-label">Nom </label>
            <input 
                class="form-control accountForm"
                name="Name" 
                type="text"
                id="Name" 
                placeholder="Nom"
                required
                RequireMessage="Veuillez entrer un nom"
                InvalidMessage="Le nom comporte un caractère illégal"
                value="${account.Name || "teste"}"
            />
            <label class="form-label">Avatar </label>
            <div class='imageUploaderContainer'>
                <div class='imageUploader' 
                     newImage='${create}' 
                     controlId='Avatar' 
                     imageSrc='${account.Avatar}' 
                     waitingImage="Loading_icon.gif">
                </div>
            </div>
            
            <div class="btnContainer">
                <input type="submit" value="Enregistrer" id="saveAccount" class="btn btn-primary saveBtn">
                <input type="button" value="Annuler" id="cancel" class="btn btn-primary cancelBtn">
            </div>
        </form>
    `);

  initImageUploaders();
  initFormValidation(); // important do to after all html injection!
  //ACOUNT FORM
  addConflictValidation(
    Accounts_API.ACCOUNTS_API_URL() + "/conflict",
    "Email",
    "saveAccount"
  );
  $("#accountForm").on("submit", async function (event) {
    event.preventDefault();
    let conflictEmail;
    if(create){
          conflictEmail = await ConflictTestRequest(
            Accounts_API.ACCOUNTS_API_URL(),
            "Email",
            "saveAccount"
          );
    }
    if (create && conflictEmail) {
      let emailElement = $("#Email");
      emailElement.setCustomValidity("Courriel déjà utilisé");
      emailElement.reportValidity();
      return;
    }

    let account = getFormDataAccount($("#accountForm"));

    if (create) account.Created = Local_to_UTC(Date.now());
    if (create) account.VerifyCode = "unverified";
    if (create) account.Authorizations = { readAccess: 0, writeAccess: 0 };
    if (!create){
      bearerToken = getSessionData().Access_token;
      console.log(bearerToken);
      console.log(getSessionData());
    }
    let cleanedAccount = {
      Name: account.Name,
      Email: account.Email,
      Password: account.Password,
      Avatar: account.Avatar,
      Created: account.Created,
      VerifyCode: account.VerifyCode,
      Authorizations: account.Authorizations,
    };
    if (create) {
      const createAccount = await Accounts_API.register(cleanedAccount);
      if (createAccount) {
        //Accounts_API.sendVerificationEmail(cleanedAccount);
        renderSignInForm(true);
      } else
        showError("Une erreur est survenue! ", Accounts_API.currentHttpError);
    } else {
      const modifiedAcc = await Accounts_API.Save(
        cleanedAccount,
        bearerToken,
        false
      );
      if (!Accounts_API.error) {
        await showPosts();
      } else
        showError("Une erreur est survenue! ", Accounts_API.currentHttpError);
    }
  });

  $("#cancel").on("click", async function () {
    await showPosts();
  });
}

function getFormDataAccount($form) {
  // prevent html injections
  const removeTag = new RegExp("(<[a-zA-Z0-9]+>)|(</[a-zA-Z0-9]+>)", "g");
  var jsonObject = {};
  // grab data from all controls
  $.each($form.serializeArray(), (index, control) => {
    jsonObject[control.name] = control.value.replace(removeTag, "");
  });
  if (jsonObject.image) {
    jsonObject.Avatar = jsonObject.image;
    delete jsonObject.image;
  }
  return jsonObject;
}

function renderSignInForm(verifyEmail = false) {
  $("#form").show();
  $("#form").empty();
  if (verifyEmail) {
    $("#form").append(
      `<h2>Votre compte a été créé. Veuillez prendre vos courriels pour récupérer votre code de vérification qui vous sera demandé lors de votre prochaine connexion.</h2>`
    );
  }
  $("#form").append(`
        <form class="form" id="signInForm">
            <label for="Email" class="form-label">Adresse de courriel </label>
            <input 
                class="form-control accountForm"
                name="Email"
                id="Email"
                type="text"
                placeholder="Adresse courriel"
                required
                RequireMessage="Veuillez entrer une adresse courriel"
                CustomErrorMessage ="Ce courriel est déjà utilisé"
                value="${""}"
            />
            <label for="Password" class="form-label">Mot de passe</label>
            <input 
                class="form-control accountForm"
                name="Password"
                type="password"
                id="Password"
                placeholder="Mot de passe"
                required
                RequireMessage="Veuillez entrer un mot de passe"
                value="${"password"}"
            />
            <div class="btnContainer">
                <input type="submit" value="Enregistrer" id="signIn" class="btn btn-primary saveBtn">
                <input type="button" value="Annuler" id="cancel" class="btn btn-primary cancelBtn">
            </div>
        </form>
    `);

  initImageUploaders();
  initFormValidation(); // important do to after all html injection!

  $("#signInForm").on("submit", async function (event) {
    event.preventDefault();

    let signInInfo = getFormDataAccount($("#signInForm"));

    let cleanedSignIn = {
      Email: signInInfo.Email,
      Password: signInInfo.Password,
    };
    const newSession = await Accounts_API.login(
      cleanedSignIn.Email,
      cleanedSignIn.Password
    );
    if (newSession) {
      createSession(newSession);
      if (newSession.User.VerifyCode == "verified") {  
        console.log("Bienvenu mon cher " + newSession.User.Name);   
        await showPosts();
      } 
      else{
        showVerificationForm(newSession);
      }
      
    } else {
      if (Accounts_API.currentHttpError == "This user email is not found.") {
      let emailElement = $("#Email");
      showErrorMessage(emailElement, "Ce courriel n'existe pas");

      } if (Accounts_API.currentHttpError == "Wrong password.") {
        let passwordElement = $("#Password");
        showErrorMessage(passwordElement, "Mot de passe invalide");
      } 
    }
  });

  $("#cancel").on("click", async function () {
    await showPosts();
  });
}
function showVerificationForm(session) {

  $("#form").show();
  $("#form").empty();
  if (session.User.VerifyCode) {
    $("#form").append(
      `<h2>Veuillez entrer votre code de vérification que vous avez recu par courriel.</h2>`
    );
  }
  $("#form").append(`
        <form class="form" id="verificationForm">
            <input 
                class="form-control accountForm"
                name="VerifyCode"
                id="verifyCode"
                type="text"
                placeholder="Code de vérification de courriel"
                required
                RequireMessage="Code de vérification de courriel"
                value="${""}"
            />
            <div class="btnContainer">
                <input type="submit" value="Vérifier" id="verify" class="btn btn-primary saveBtn">
            </div>
        </form>
    `);

  initImageUploaders();
  initFormValidation(); // important do to after all html injection!

  $("#verificationForm").on("submit", async function (event) {
    event.preventDefault();

    let verifyData = getFormDataAccount($("#verificationForm"));
    const confirmation = await Accounts_API.verify(
      session.User.Id,
      verifyData.VerifyCode
    );
    if (confirmation) 
    {
      let user = JSON.parse(sessionStorage.getItem("user"));
      if (user) {
        user.VerifyCode = "verified";
        sessionStorage.setItem("user", JSON.stringify(user));
        updateDropDownMenu();
      }
      await showPosts();
    } 
    else{
      if (
        Accounts_API.currentHttpError == "Verification code does not matched."
      ) {
        let codeElement = $("#verifyCode");
        showErrorMessage(codeElement, "Code de vérification invalide");
      } else {
        showError("Une erreur est survenue!", Accounts_API.currentHttpError);
      }
    } 
  });

  $("#cancel").on("click", async function () {
    await showPosts();
  });
}
function createSession(user) {
  sessionStorage.setItem("user", JSON.stringify(user));
  startCountdown();
  updateDropDownMenu();
}
function getSessionData() {
  return JSON.parse(sessionStorage.getItem("user"));
}
async function LogOut() {
  
  await Accounts_API.logout(sessionStorage.getItem("user").Id);
  sessionStorage.removeItem("user");
  updateDropDownMenu();
}
function showErrorMessage(inputElement, message) {

  var errorElement = inputElement.next(".error-message");
  if (errorElement.length) {
    errorElement.text(message);
  } else {
    var errorElement = $("<div></div>")
      .addClass("error-message")
      .css("color", "red")
      .text(message);
    inputElement.after(errorElement);
  }
}