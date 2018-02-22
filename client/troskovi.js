Accounts.ui.config({
  passwordSignupFields: 'USERNAME_AND_EMAIL'
});
Meteor.subscribe("kupci");
Meteor.subscribe("prodavci");
Meteor.subscribe("troskovi");
Meteor.subscribe("prihodi");
Meteor.subscribe("appsettings");
Router.configure({
  layoutTemplate: 'ApplicationLayout'
});
Router.onBeforeAction(function () {
  // all properties available in the route function
  // are also available here such as this.params
  var clang='', ouser=null;
  if (!Meteor.userId()) {
    // if the user is not logged in, render the Login template
    this.render('home');
    this.redirect('/');
  } else {
    // otherwise don't hold up the rest of hooks or our route/action function
    // from running
      ouser = Meteor.users.findOne({_id: Meteor.userId()});
      clang = ouser.profile.language;
      
      if (clang && !(Language.userLang==clang)) {
        document.cookie = "userlang=" + clang + ";";
        // force reload
        document.location = document.location;
      } else {
        var okupac=null, ckupacid="";
        if (!Session.get("aktivniKupacId")) {
          okupac = Kupci.findOne({"userid":Meteor.userId()});
          if (typeof(okupac)=="object") {
            ckupacid = okupac._id;
          };
          Session.set("aktivniKupacId", ckupacid);
        };
        this.next();
      }
  }
});
Router.route('/', function () {
  this.render('home');
});
Router.route('/kupci', function () {
  this.render('kupci');
});
Router.route('/kupac-unos', function () {
  this.render('kupacUnos');
});
Router.route('/kupac-izmeni/:_id', function () {
  this.render('kupacIzmeni');
  }, {
  name: 'kupac.izmeni',
  data: function() { return Kupci.findOne(this.params._id); }
});
Router.route('/prodavci', function () {
  this.render('prodavci');
});
Router.route('/prodavac-unos', function () {
  this.render('prodavacUnos');
});
Router.route('/prodavac-izmeni/:_id', function () {
  this.render('prodavacIzmeni');
  }, {
  name: 'prodavac.izmeni',
  data: function() { return Prodavci.findOne(this.params._id); }
});
Router.route('/trosak-izmeni/:_id', function () {
  this.render('trosakIzmeni');
  }, {
  name: 'trosak.izmeni',
  data: function() { return Troskovi.findOne(this.params._id); }
});
Router.route('/troskovi', function () {
  this.render('troskovi');
});
Router.route('/prihodi', function () {
  this.render('prihodi');
});
Template.registerHelper('kupci', function() {
  return Kupci.find({});
});
Template.registerHelper('isSelectedKupac', function() {
  return Session.equals("aktivniKupacId", this._id) ? "selected" : "";
});
Template.registerHelper('getIme', function() {
  return this.firma + ' ' + this.ime + ' ' + this.prezime;
});
Template.registerHelper('getKurs', function() {
  var o = Appsettings.findOne({kod:1}), nkurs=0.00;
  if (typeof(o)==="object")
    nkurs=o.kurs;
  return accounting.formatMoney(nkurs, { symbol: "",  format: "%v" });
});
Template.registerHelper('getDug', function() {
  return accounting.toFixed(Troskovi.find({"kupacid":Session.get("aktivniKupacId"),placeno:false}).sum('iznos'),2);
});
Template.registerHelper('getDugEuro', function() {
  var nkurs = 0.00, o=null;
  o = Appsettings.findOne({kod:1});
  if (typeof(o)==='object') {
    nkurs = o.kurs;
  };
  return accounting.toFixed(Troskovi.find({"kupacid":Session.get("aktivniKupacId"),placeno:false}).sum('iznos')/nkurs,2);
});
Template.registerHelper('getKupacIme', function() {
  var okupac=null, cime='';
  okupac = Kupci.findOne({"_id":Session.get("aktivniKupacId")});
  if (okupac) {
    cime = okupac.ime + ' ' + okupac.prezime;
  };
  return cime;
});
Template.registerHelper('getSaldo', function() {
  var nduguje=0.00, npotrazuje=0.00,nsaldo=0.00;
  nduguje = Troskovi.find({"kupacid":Session.get("aktivniKupacId"),placeno:true}).sum('iznos');
  npotrazuje = Prihodi.find({"kupacid":Session.get("aktivniKupacId")}).sum('iznos');
  nsaldo = npotrazuje - nduguje;
  return accounting.toFixed(nsaldo,2);
});
Template.registerHelper('getSaldoEur', function() {
  var nduguje=0.00, npotrazuje=0.00,nsaldo=0.00, ckupacid=Session.get("aktivniKupacId");
  nduguje = Troskovi.find({"kupacid":ckupacid,placeno:true}).sum(function(o) { return o.iznos/o.kurs } );
  npotrazuje = Prihodi.find({"kupacid":ckupacid}).sum(function(o) { return o.iznos/o.kurs });
  nsaldo = npotrazuje - nduguje;
  return accounting.toFixed(nsaldo,2);
});
Template.registerHelper('getTroskoviSum', function() {
  var nduguje=0.00, ckupacid=Session.get("aktivniKupacId");
  nduguje = Troskovi.find({"kupacid":ckupacid,placeno:true}).sum(function(o) { return o.iznos/o.kurs } );
  return accounting.toFixed(nduguje,2);
});
Template.registerHelper('getPrihodiSum', function() {
  var npotrazuje=0.00, ckupacid=Session.get("aktivniKupacId");
  npotrazuje = Prihodi.find({"kupacid":ckupacid}).sum(function(o) { return o.iznos/o.kurs });
  return accounting.toFixed(npotrazuje,2);
});
Template.registerHelper('getSelectedLanguage', function() {
  var clangdescript = "";
  if (Language.userLang=="sr") {
    clangdescript = "Srpski";
  } else {
    clangdescript = "English";
  };
  return clangdescript;
});

Template.ApplicationLayout.helpers({
  activeIfTemplateIs: function (template) {
      var currentRoute = Router.current();
      return currentRoute &&
        template === currentRoute.lookupTemplate() ? 'active' : '';
    }
});

Template.ApplicationLayout.events({
  'change .js-kupac-picker': function(evt) {
    var newValue = $(evt.target).val();
    var oldValue = Session.get("aktivniKupacId");
    if (newValue != oldValue) {
      Session.set("aktivniKupacId", newValue);
    };
  },
  'click .js-troskovi-kurs': function(event) {
    var nkurs = 0, niznos=0,o=null;

    event.preventDefault();
    o = Appsettings.findOne({kod:1});
    nkurs = o.kurs;
    bootbox.prompt({
      title: "Unesi novi kurs evra",
      value: accounting.toFixed(nkurs,2),
      callback: function(result) {
        if (result === null) {
          
        } else {
          niznos = accounting.unformat(accounting.toFixed(result,2))
          Meteor.call("updateAppsettings", "kurs", niznos);
        }
      }
    });
    return false;
  },

  'click .js-language-sr': function(event) {
    Meteoris.Flash.set('success', 'OK!');
    if (Meteor.userId()) {
      Meteor.users.update({_id: Meteor.userId()}, {$set: {"profile.language": "sr"}});
    };
    document.cookie = "userlang=" + 'sr' + ";";
    // force reload
    document.location = document.location;
    return true;
  },
  'click .js-language-en': function(event) {
    Meteoris.Flash.set('success', 'OK!');
    if (Meteor.userId()) {
      Meteor.users.update({_id: Meteor.userId()}, {$set: {"profile.language": "en"}});
    };
    document.cookie = "userlang=" + 'en' + ";";
    // force reload
    document.location = document.location;
    return true;
  }
/*   'click .js-troskovi-kurs-refresh': function(event) {
    var rates = new OpenExchangeRates('');
    rates.latest(function(err, result){
      var neuro = 0.00;
      neuro = result.rates.RSD/result.rates.EUR;
      neuro = accounting.toFixed(neuro,2);
      Meteor.call("updateAppsettings", "kurs", neuro);
    });
  } */

});

Template.home.helpers({
  getUserName: function() { return Meteor.user().username; }
});
Template.home.events({
  'submit .js-signin-form' : function(event) {
    var cinputUsername = event.target.inputUsername.value, cinputPassword = event.target.inputPassword.value;
    Meteor.loginWithPassword(cinputUsername, cinputPassword, function(err){
    event.target.inputUsername.value = '';
    event.target.inputPassword.value = '';
    if (err)
        // The user might not have been found, or their passwword
        // could be incorrect. Inform the user that their
        // login attempt has failed. 
      Meteoris.Flash.set('danger', Language.getValue("wrong_username_or_password"));
    else
      Meteoris.Flash.set('success', Language.getValue("login_success"));
    });
    return false;
  },
  'click .js-log-out': function(event) {
    Meteor.logout();
  }
});
Template.kupci.helpers({
  kupci: function() {
    return Kupci.find({});
    }
});
Template.kupci.events({
  'click .js-kupac-obrisi': function() {
    var nid = this._id;
    BootstrapModalPrompt.prompt({
      title: Language.getValue("warning"),
      content: Language.getValue("really_delete"),
      btnDismissText: Language.getValue("cancel")
      }, function(result) {
        if (result) {
          Meteor.call("deleteKupac", nid,  
            function(error, result){
              if (error) {
                Meteoris.Flash.set('danger', Language.getValue("error"));
              } else {
                Meteoris.Flash.set('success', Language.getValue("deleted"));
              };
              return true;
            });
        } else {
          // User did not confirm, do nothing.
        ;}
        }
      );
  }
});
Template.kupacUnos.events({
  'submit .js-kupac-unos': function(event) {
    var cfirma = event.target.firma.value, cime = event.target.ime.value, cprezime = event.target.prezime.value;
    if (!cfirma && !cprezime) {
      Meteoris.Flash.set('danger', Language.getValue("must_enter_lastname_or_company"));
      return false;
    };
    Meteor.call("insertKupac", cime, cprezime, cfirma,  
      function(error, result){
        if (error) {
          Meteoris.Flash.set('danger', Language.getValue("error"));
        } else {
          Session.set("aktivniKupacId", result);
          Meteoris.Flash.set('success', Language.getValue("saved"));
        };
        return true;
      });
    Router.go('/kupci');
    return false;
  }
});
Template.kupacIzmeni.events({
  'submit .js-kupac-izmena': function(event) {
    var cfirma = event.target.firma.value, cime = event.target.ime.value, cprezime = event.target.prezime.value;
    if (!cfirma && !cprezime) {
      Meteoris.Flash.set('danger', Language.getValue("must_enter_lastname_or_company"));
      return false;
    };
    Meteor.call("updateKupac", this._id, cime, cprezime, cfirma);
    Router.go('/kupci');
    Meteoris.Flash.set('success', Language.getValue("saved"));
    return false;
  }
});
Template.prodavci.helpers({
  prodavci: function() {
    return Prodavci.find({});
    }
});
Template.prodavci.events({
  'click .js-prodavac-obrisi': function() {
    var nid = this._id, oresult=null;
    BootstrapModalPrompt.prompt({
      title: Language.getValue("warning"),
      content: Language.getValue("really_delete"),
      btnDismissText: Language.getValue("cancel")
      }, function(result) {
        if (result) {
          Meteor.call("deleteProdavac", nid,  
            function(error, result){
              if (error) {
                Meteoris.Flash.set('danger', Language.getValue("error"));
              } else {
                Meteoris.Flash.set('success', Language.getValue("deleted"));
              };
              return true;
            });
        } else {
          // User did not confirm, do nothing.
        ;}
        }
      );
  }
});
Template.prodavacUnos.events({
  'submit .js-prodavac-unos': function(event) {
    var cfirma = event.target.firma.value, cime = event.target.ime.value, cprezime = event.target.prezime.value;
    if (!cfirma && !cprezime) {
      Meteoris.Flash.set('danger', Language.getValue("must_enter_lastname_or_company"));
      return false;
    };
    Meteor.call("insertProdavac", cfirma, cime, cprezime);
    Router.go('/prodavci');
    Meteoris.Flash.set('success', Language.getValue("saved"));
    return false;
  }
});
Template.prodavacIzmeni.events({
  'submit .js-prodavac-izmena': function(event) {
    var cfirma = event.target.firma.value, cime = event.target.ime.value, cprezime = event.target.prezime.value;
    if (!cfirma && !cprezime) {
      Meteoris.Flash.set('danger', Language.getValue("must_enter_lastname_or_company"));
      return false;
    };
    Meteor.call("updateProdavac", this._id, cfirma, cime, cprezime);
    Router.go('/prodavci');
    Meteoris.Flash.set('success', Language.getValue("saved"));
    return false;
  }
});
Template.troskovi.helpers({
  troskovi: function() {
     return Troskovi.find({"kupacid":Session.get("aktivniKupacId")},{sort:{vreme:-1}});
    },
  aktivniKupac: function() {return Session.get("aktivniKupacId");},
  prodavci: function() {
    return Prodavci.find({});
    },
  getVreme: function() {return moment(this.vreme).format('DD.MM.YYYY. H:mm:ss');},
  getIznos: function() {return accounting.formatMoney(this.iznos, { symbol: "",  format: "%v" });},
  getIznosEur: function() {
    return accounting.formatMoney(this.iznos/this.kurs, { symbol: "",  format: "%v" });
    },
  getPlaceno: function() { return this.placeno ? "checked" : ""; }
});
Template.troskovi.events({
  'click .js-trosak-obrisi': function() {
    var nid = this._id;
    BootstrapModalPrompt.prompt({
      title: Language.getValue("warning"),
      content: Language.getValue("really_delete"),
      btnDismissText: Language.getValue("cancel")
      }, function(result) {
        if (result) {
          Meteor.call("deleteTrosak", nid);
          Meteoris.Flash.set('success', Language.getValue("deleted"));
        } else {
          // User did not confirm, do nothing.
        ;}
        }
      );
  },
  'submit .js-trosak-unos': function(event) {
    var cprodavacid = event.target.prodavacid.value, copis = event.target.opis.value, ciznos = event.target.iznos.value, niznos=0.00, ckupacid='';
    niznos = accounting.unformat(accounting.toFixed(ciznos,2));
    if (!copis) {
      Meteoris.Flash.set('danger', Language.getValue("must_enter_description"));
      return false;
    };
    if (!niznos) {
      Meteoris.Flash.set('danger', Language.getValue("must_enter_amount"));
      return false;
    };
    ckupacid = Session.get("aktivniKupacId");
    if (!ckupacid) {
      Meteoris.Flash.set('danger', Language.getValue("must_enter_buyer"));
      return false;
    };
    Meteor.call("insertTrosak", ckupacid, cprodavacid, copis, niznos);
    //event.target.opis.value = '';
    event.target.iznos.value = '';
    Meteoris.Flash.set('success', Language.getValue("saved"));
    return false;
  },
  'click .js-trosak-placen': function(event) {
    var nid = this._id, lplacen = event.target.checked, cquestion='', ochk = event.target;
    cquestion = Language.getValue("really_mark_exspense_as");
    if (lplacen) {
      cquestion = cquestion + " " + Language.getValue("paid") + "?";
    } else {
      cquestion = cquestion + " " + Language.getValue("unpaid") + "?";
    };
    BootstrapModalPrompt.prompt({
      title: Language.getValue("warning"),
      content: cquestion,
      btnDismissText: Language.getValue("cancel")
      }, function(result) {
        if (result) {
          Meteor.call("updateTrosak", nid, null, null, null, lplacen);
          Meteoris.Flash.set('success', Language.getValue("saved"));
        } else {
          // User did not confirm, do nothing.
          ochk.checked = !ochk.checked;
        ;}
        }
      );
  }
});
Template.trosakIzmeni.helpers({
  prodavci: function() {
    return Prodavci.find({});
    },
  isSelected: function() {
    var cret="";
    if (typeof(Template.parentData(1).prodavacid)==="string" && 
        typeof(this._id)==="string" && 
        typeof(Template.parentData(1))==="object" && 
        Template.parentData(1).prodavacid===this._id) {
      cret="selected";
    };
    return cret;
  }
})

Template.trosakIzmeni.events({
  'submit .js-trosak-izmeni': function(event) {
    var cprodavacid = event.target.prodavacid.value, copis = event.target.opis.value, ciznos = event.target.iznos.value, niznos=0.00;
    niznos = accounting.unformat(accounting.toFixed(ciznos,2))
    if (!copis) {
      Meteoris.Flash.set('danger', Language.getValue("must_enter_description"));
      return false;
    };
    if (!niznos) {
      Meteoris.Flash.set('danger', Language.getValue("must_enter_amount"));
      return false;
    };
    Meteor.call("updateTrosak", this._id, cprodavacid, copis, niznos);
    Router.go('/troskovi');
    Meteoris.Flash.set('success', Language.getValue("saved"));
    return false;
  }
});

Template.prihodi.helpers({
  prihodi: function() {
    return Prihodi.find({"kupacid":Session.get("aktivniKupacId")},{sort:{vreme:-1}});
    },
  aktivniKupac: function() {return Session.get("aktivniKupacId");},
  getVreme: function() {return moment(this.vreme).format('DD.MM.YYYY. H:mm:ss');},
  getIznos: function() {return accounting.formatMoney(this.iznos, { symbol: "",  format: "%v" });},
  getIznosEur: function() {
    return accounting.formatMoney(this.iznos/this.kurs, { symbol: "",  format: "%v" });
  }
});
Template.prihodi.events({
  'click .js-prihod-obrisi': function() {
    var nid = this._id;
    BootstrapModalPrompt.prompt({
      title: Language.getValue("warning"),
      content: Language.getValue("really_delete"),
      btnDismissText: Language.getValue("cancel")
      }, function(result) {
        if (result) {
          Meteor.call("deletePrihod", nid);
          Meteoris.Flash.set('success', Language.getValue("deleted"));
        } else {
          // User did not confirm, do nothing.
        ;}
        }
      );
  },
  'submit .js-prihod-unos': function(event) {
    var copis = event.target.opis.value, ciznos = event.target.iznos.value, niznos=0.00, ciznoseur = event.target.iznoseur.value, niznoseur=0.00, ckupacid='';
    niznos = accounting.unformat(accounting.toFixed(ciznos,2))
    niznoseur = accounting.unformat(accounting.toFixed(ciznoseur,2));
    if (!copis) {
      Meteoris.Flash.set('danger', Language.getValue("must_enter_description"));
      return false;
    };
    if (!niznos && !niznoseur) {
      Meteoris.Flash.set('danger', Language.getValue("must_enter_amount"));
      return false;
    };
    ckupacid = Session.get("aktivniKupacId");
    if (!ckupacid) {
      Meteoris.Flash.set('danger', Language.getValue("must_enter_buyer"));
      return false;
    };
    Meteor.call("insertPrihod", ckupacid, copis, niznos, niznoseur);
    event.target.opis.value = '';
    event.target.iznos.value = '';
    event.target.iznoseur.value = '';
    Meteoris.Flash.set('success', Language.getValue("saved"));
    return false;
  }
});