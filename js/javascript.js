Selectize.define('hidden_textfield', function(options) {
    var self = this;
    this.showInput = function() {
         this.$control.css({cursor: 'pointer'});
         this.$control_input.css({opacity: 0, position: 'relative', left: self.rtl ? 10000 : -10000 });
         this.isInputHidden = false;
     };

     this.setup_original = this.setup;

     this.setup = function() {
          self.setup_original();
          this.$control_input.prop("disabled","disabled");
     }
});

var apiGetUsers = "https://turotrackerfetcher.azurewebsites.net/api/users?code=W0cY9erJuRhGLxSra7jDufItw6SRNnkPaHCw7pzmnLrRO9xa2Uln2w==";
var apiGetClubs = "https://turotrackerfetcher.azurewebsites.net/api/clubs?code=15OpgjQl5HA4uYALGRZxvc7peWwBIjdHe32wJtD3ASRkgAiFRzKqfA==";
var apiGetStats = "https://turotrackerfetcher.azurewebsites.net/api/stats?code=CfEAbaShDafw1Kzt3dyZjI8fG7AM3kpsg6jb5NyZ4ikS1J76rru9xA==";

var selectedUserIDs = [];
var selectedClub = 0;

var users = {};
var clubs = {};

var data = {};
var mode = 1;

var usersLoaded = false;
var clubsLoaded = false;

var graph = null;

var urlParams = new URLSearchParams(window.location.search);

function onLoad()
{
    if (!usersLoaded || !clubsLoaded)
    {
        return;
    }

    console.log("done loading")
    parseUrl();
}

function urlParamsUpdated()
{
    var loc = window.location;
    var url = `${loc.origin}${loc.pathname}?${urlParams.toString()}`
    console.log(url)
    history.replaceState(null, '', url);
}

function parseUrl()
{
    console.log("parsing url")

    if (urlParams.has('mode'))
    {
        console.log("Found mode " + mode)
        selectMode(urlParams.get('mode'))
    }

    if (urlParams.has('club'))
    {
        console.log("Found club " + selectedClub)
        selectClub(urlParams.get('club'))
    }
    
    if (urlParams.has('users'))
    {
        var userIDs = urlParams.get('users').split(',')
        console.log("Found users " + userIDs);
        userIDs.forEach( (userID, index) => selectUser(userID));
    }
}

function delay(time, func)
{
    setTimeout(func, time)
}

$(document).ready( function() {
    $('#selectMode').selectize({
        plugins: ['hidden_textfield']
    });
    $('#selectClub').selectize({
        plugins: ['hidden_textfield']
    });
    $('#selectUser').selectize({
        onDropdownOpen: function(dropdown) {
                this.clear(true)
        }
    });

    var select = $('#selectUser')[0].selectize
    select.setTextboxValue("Laster deltakere...")
    
    var select = $('#selectClub')[0].selectize
    select.setTextboxValue("Laster arrangører...")

    $.get(apiGetUsers, function ( data ) {
        var select = $('#selectUser')[0].selectize
        select.clearOptions();
        select.addOption({value: -1, text:"Legg til deltaker"})
        select.addOption({value: -1, text:"------------"})
        $.each(data, function(i, user) {
            users[user.userID] = user;
            select.addOption({value:user.userID, text:user.name})
        });
        select.setValue(-1, true);

        usersLoaded = true;
        onLoad();
        
        $.get(apiGetStats, function ( data ) {
            console.log(data)
            var userStrs = data.map(stats => users[stats.userID].name + " [" + stats.score + "]");
            var userIds = data.map(stats => stats.userID)
            var link = "index.html?users=" + userIds.join(",") + "&mode=2"
            var str = "<a href=\"" + link + "\">Flest klipp siste 5 dager</a>: " + userStrs.join(", ")
            $('#footer').html(str)
        });
    });
    
    $.get(apiGetClubs, function ( data ) {
        clubs[0] = {clubID: 0, name: "Norge"}
        var select = $('#selectClub')[0].selectize
        select.clearOptions();
        select.addOption({value: 0, text:"Norge"})
        select.addOption({value: -1, text:"------------"})
        $.each(data, function(i, club) {
            clubs[club.clubID] = club;
            select.addOption({value:club.clubID, text:club.name})
        });
        select.setValue(0, true);

        clubsLoaded = true;
        onLoad();
    });
});

function clubSelected(selector) {
    var clubID = parseInt(selector.options[selector.selectedIndex].value);
    if  (clubID  == -1 || isNaN(clubID))
    {
        console.log("Selected 0")
        $('#selectClub')[0].selectize.setValue(0, false)
        return;
    }

    selectClub(clubID);
    urlParams.set("club", clubID);
    urlParamsUpdated();
}

function selectClub(clubID) {
    if (clubID == selectedClub || isNaN(clubID))
    {
        return;
    }

    selectedClub = clubID;
    $('#selectClub')[0].selectize.setValue(clubID, false)

    userData = {}
    selectedUserIDs.forEach( (userID, index) => getDataForUser(userID));
}


function userSelected(selector) {
    var userID = parseInt(selector.options[selector.selectedIndex].value);
    if (userID  == -1)
    {
        return;
    }
    
    $('#selectUser')[0].selectize.setValue(-1, false);
    selectUser(userID);
}

function selectUser(userID)
{
    var index = selectedUserIDs.indexOf(userID);
    if (index != -1 || isNaN(userID))
    {
        return;
    }

    selectedUserIDs.push(userID);

    getDataForUser(userID);
    urlParams.set("users", selectedUserIDs.join(','));
    urlParamsUpdated();
}

function selectMode(newMode)
{
    if (newMode == mode || isNaN(newMode))
    {
        return;
    }

    mode = newMode;
    $('#selectMode')[0].selectize.setValue(newMode, false);
    dataUpdated();
    urlParams.set("mode", mode);
    urlParamsUpdated();
}

function modeSelected(selector) {
    var newMode = parseInt(selector.options[selector.selectedIndex].value);
    selectMode(newMode)
}

function getDataForUser(userID)
{
    if  (selectedClub == null)
    {
        return;
    }

    console.log(`Getting data for user [${userID}] in club [${selectedClub}]`)
    var url = `https://turotrackerfetcher.azurewebsites.net/api/scores/${selectedClub}/${userID}?code=D2DC7NmU0RuGdoKvH6VFfDAaPDkM5Zy9SxXyNZkOoP8uQfoJ8/6wKA==`

    $.get(url, function ( userData ) {
        data[userID] = userData;
        dataUpdated();
    });
}

function userRemoved(userID)
{
    var index = selectedUserIDs.indexOf(userID);
    if (index == -1)
    {
        return
    }

    selectedUserIDs.splice(index, 1);
    delete data[userID];
    dataUpdated();

    urlParams.set("users", selectedUserIDs.join(','));
    urlParamsUpdated();
}

function legendHandler(e, legendItem)
{
    console.log(legendItem);
    var userName = legendItem.text;
    for (key in selectedUserIDs)
    {
        var userID = selectedUserIDs[key]
        if (users[userID].name == userName)
        {
            userRemoved(userID);
            return
        }
    }
}

function dataUpdated()
{
    var datasets = [];
    for (var key in data)
    {
        var userData = data[key];
        var userValues;
        if (mode == 4) { userValues = userData.map(ud => {return {x: ud.date, y: ud.rankPunches, label: ud.rankPunches + "."}} ) }
        else if (mode == 3) { userValues = userData.map(ud => {return {x: ud.date, y: ud.rankPoints, label: ud.rankPoints + "."}}) }
        else if (mode == 2) { userValues = userData.map(ud => {return {x: ud.date, y: ud.punches, label: ud.punches}}) }
        else { userValues = userData.map(ud => {return {x: moment(ud.date), y: ud.points, label: ud.points}}) }

        var dataset = {
                label: users[key].name,
                data : userValues,
                fill: false
        };

        console.log(dataset);
        datasets.push(dataset);
    }

    var ctx = document.getElementById('graph').getContext('2d');
    if (graph != null)
    {
        graph.destroy();
    }

    graph = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: datasets
        },
        options: {
            layout: {
                padding: {
                    left: 10,
                    right: 20
                }
            },
            elements: {
                line: {
                    tension: 0
                }
            },
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                xAxes: [{
                    type: 'time'
                }],
                yAxes: [{
                    ticks: {
                        beginAtZero: true
                    }
                }]
            },
            plugins: {
                colorschemes: {
                    scheme: 'brewer.SetTwo8'
                },
                datalabels: {
                    display: function(context) {
                        if (context.dataset.data.length == (context.dataIndex + 1))
                        {
                            return true
                        }

                        return 'auto'
                    },
                    align: 'top',
                    textStrokeColor: 'white',
                    font: {
                        weight: 'bold'
                    },
                    clip: false
                }
            },
            legend: {
                onClick: legendHandler
            }
        }
    });
}