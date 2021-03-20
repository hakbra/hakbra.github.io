Selectize.define('hidden_textfield', function (options) {
    var self = this;
    this.showInput = function () {
        this.$control.css({ cursor: 'pointer' });
        this.$control_input.css({ opacity: 0, position: 'relative', left: self.rtl ? 10000 : -10000 });
        this.isInputHidden = false;
    };

    this.setup_original = this.setup;

    this.setup = function () {
        self.setup_original();
        this.$control_input.prop("disabled", "disabled");
    }
});

var apiGetUsers = "https://turotrackerfetcher.azurewebsites.net/api/users?code=W0cY9erJuRhGLxSra7jDufItw6SRNnkPaHCw7pzmnLrRO9xa2Uln2w==";
var apiGetClubs = "https://turotrackerfetcher.azurewebsites.net/api/clubs?code=15OpgjQl5HA4uYALGRZxvc7peWwBIjdHe32wJtD3ASRkgAiFRzKqfA==";
var apiGetStats = "https://turotrackerfetcher.azurewebsites.net/api/stats?code=CfEAbaShDafw1Kzt3dyZjI8fG7AM3kpsg6jb5NyZ4ikS1J76rru9xA==";

var selectedUserIDs = [];
var selectedClub = 0;
var selectedMode = 1;

var users = {};
var usersLoaded = false;

var clubs = {};

var data = {};
var statsData = null;

var graph = null;

function UpdateUrlParameters() {
    var urlParams = new URLSearchParams();
    if (selectedClub != 0) {
        urlParams.set('club', selectedClub)
    }

    if (selectedUserIDs.length > 0) {
        urlParams.set('users', selectedUserIDs.join(','))
    }

    if (selectedMode != 1) {
        urlParams.set('mode', selectedMode)
    }

    var loc = window.location;
    var url = `${loc.origin}${loc.pathname}?${urlParams.toString()}`
    history.replaceState(null, '', url);
}

function parseUrl() {
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('mode')) {
        SetMode(urlParams.get('mode'))
    }

    if (urlParams.has('club')) {
        SetClub(urlParams.get('club'))
    }

    if (urlParams.has('users')) {
        var userIDs = urlParams.get('users').split(',')
        userIDs.forEach((userID, index) => AddUser(userID));
    }
}

$(document).ready(function () {
    $('#selectMode').selectize({
        plugins: ['hidden_textfield']
    });
    $('#selectClub').selectize({
        plugins: ['hidden_textfield']
    });
    $('#selectUser').selectize({
        onDropdownOpen: function (dropdown) {
            this.clear(true)
        }
    });

    var select = $('#selectUser')[0].selectize
    select.setTextboxValue("Laster deltakere...")

    var select = $('#selectClub')[0].selectize
    select.setTextboxValue("Laster arrangører...")

    $.get(apiGetUsers, function (data) {
        console.log("Users returned")
        var select = $('#selectUser')[0].selectize
        select.clearOptions();
        select.addOption({ value: -1, text: "Legg til deltaker" })
        select.addOption({ value: -1, text: "------------" })
        $.each(data, function (i, user) {
            users[user.userID] = user;
            select.addOption({ value: user.userID, text: user.name })
        });
        select.setValue(-1, true);

        usersLoaded = true;
        UpdateStats();
        RedrawGraph();
    });

    $.get(apiGetClubs, function (data) {
        console.log("Clubs returned")
        clubs[0] = { clubID: 0, name: "Norge" }
        var select = $('#selectClub')[0].selectize
        select.clearOptions();
        select.addOption({ value: 0, text: "Norge" })
        select.addOption({ value: -1, text: "------------" })
        $.each(data, function (i, club) {
            clubs[club.clubID] = club;
            select.addOption({ value: club.clubID, text: club.name })
        });
        select.setValue(selectedClub, true);
    });

    $.get(apiGetStats, function (data) {
        console.log("Stats returned")
        statsData = data;
        UpdateStats();
    });

    CreateGraph();
    parseUrl();
});

function UpdateStats() {
    if (statsData == null || !usersLoaded) {
        return;
    }

    var userStrs = statsData.map(stats => users[stats.userID].name + " [" + stats.score + "]");
    var userIds = statsData.map(stats => stats.userID)
    var link = "index.html?users=" + userIds.join(",") + "&mode=2"
    var str = "<a href=\"" + link + "\">Flest klipp siste 5 dager</a>: " + userStrs.join(", ")
    $('#footer').html(str)
}

function clubSelected(selector) {
    var clubID = parseInt(selector.options[selector.selectedIndex].value);
    if (clubID == -1 || isNaN(clubID)) {
        $('#selectClub')[0].selectize.setValue(0, false)
        return;
    }

    SetClub(clubID);
}

function SetClub(clubID) {
    if (clubID == selectedClub || isNaN(clubID)) {
        return;
    }

    selectedClub = clubID;
    $('#selectClub')[0].selectize.setValue(clubID, false)

    ClearGraph();
    UpdateUrlParameters();

    userData = {}
    selectedUserIDs.forEach((userID, index) => GetDataForUser(userID));
}


function userSelected(selector) {
    var userID = parseInt(selector.options[selector.selectedIndex].value);
    if (userID == -1) {
        return;
    }

    $('#selectUser')[0].selectize.setValue(-1, false);
    AddUser(userID);
}

function AddUser(userID) {
    var index = selectedUserIDs.indexOf(userID);
    if (index != -1 || isNaN(userID)) {
        return;
    }

    selectedUserIDs.push(userID);

    GetDataForUser(userID);
    UpdateUrlParameters();
}

function SetMode(mode) {
    if (mode == selectedMode || isNaN(mode)) {
        return;
    }

    selectedMode = mode;
    $('#selectMode')[0].selectize.setValue(mode, false);

    RedrawGraph();
    UpdateUrlParameters();
}

function modeSelected(selector) {
    var newMode = parseInt(selector.options[selector.selectedIndex].value);
    SetMode(newMode)
}

function GetDataForUser(userID) {
    if (selectedClub == null) {
        return;
    }

    console.log(`Getting data for user [${userID}] in club [${selectedClub}]`)
    var url = `https://turotrackerfetcher.azurewebsites.net/api/scores/${selectedClub}/${userID}?code=D2DC7NmU0RuGdoKvH6VFfDAaPDkM5Zy9SxXyNZkOoP8uQfoJ8/6wKA==`

    $.get(url, function (userData) {
        data[userID] = userData;
        console.log("Got data for " + userID)
        AddUserGraph(userID);
    });
}

function RemoveUser(userID) {
    var index = selectedUserIDs.indexOf(userID);
    if (index == -1) {
        return
    }

    selectedUserIDs.splice(index, 1);
    delete data[userID];

    RemoveUserGraph(userID)
    UpdateUrlParameters();
}

function CreateGraph() {
    var ctx = document.getElementById('graph').getContext('2d');
    graph = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: []
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
                    type: 'time',
                    ticks: {
                        source: 'data'
                    }
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
                    display: function (context) {
                        if (context.dataset.data.length == (context.dataIndex + 1)) {
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

function legendHandler(e, legendItem) {
    var userName = legendItem.text;
    for (key in selectedUserIDs) {
        var userID = selectedUserIDs[key]
        if (users[userID].name == userName) {
            RemoveUser(userID);
            return
        }
    }
}

function ClearGraph(update = true) {
    graph.data.datasets = []

    if (update) {
        graph.update()
    }
}

function RedrawGraph() {
    ClearGraph();

    for (userID in data) {
        AddUserGraph(userID, false)
    }

    graph.update();
}

function RemoveUserGraph(userID, update = true) {
    var index = graph.data.datasets.findIndex(ds => ds.userID == userID)
    graph.data.datasets.splice(index, 1)

    if (update) {
        graph.update();
    }
}

function AddUserGraph(userID, update = true) {
    if (!usersLoaded) {
        console.log("Users not loaded yet, returning")
        return;
    }

    if (graph.data.datasets.some(ds => ds.userID == userID)) {
        console.log("User " + userID + " already added");
        return;
    }

    if (selectedMode == 4) { userValues = data[userID].map(ud => { return { x: moment(ud.date, "YYYY-MM-DD"), y: ud.rankPunches, label: ud.rankPunches + "." } }) }
    else if (selectedMode == 3) { userValues = data[userID].map(ud => { return { x: moment(ud.date, "YYYY-MM-DD"), y: ud.rankPoints, label: ud.rankPoints + "." } }) }
    else if (selectedMode == 2) { userValues = data[userID].map(ud => { return { x: moment(ud.date, "YYYY-MM-DD"), y: ud.punches, label: ud.punches } }) }
    else { userValues = data[userID].map(ud => { return { x: moment(ud.date, "YYYY-MM-DD"), y: ud.points, label: ud.points } }) }

    var dataset = {
        label: users[userID].name,
        data: userValues,
        fill: false,
        userID: userID
    };

    console.log("Added data for user " + userID)
    graph.data.datasets.push(dataset);

    if (update) {
        graph.update();
    }
}