var apiGetUsers = "https://turotrackerfetcher.azurewebsites.net/api/users?code=W0cY9erJuRhGLxSra7jDufItw6SRNnkPaHCw7pzmnLrRO9xa2Uln2w==";
var apiGetClubs = "https://turotrackerfetcher.azurewebsites.net/api/clubs?code=15OpgjQl5HA4uYALGRZxvc7peWwBIjdHe32wJtD3ASRkgAiFRzKqfA==";

var selectedUserIDs = [];
var selectedClub = 0;

var users = {};
var clubs = {};

var data = {};
var mode = 1;
var loaded = false;

var graph = null;

var urlParams = null;

var default_colors = ['#3366CC','#DC3912','#FF9900','#109618','#990099','#3B3EAC','#0099C6','#DD4477','#66AA00','#B82E2E','#316395','#994499','#22AA99','#AAAA11','#6633CC','#E67300','#8B0707','#329262','#5574A6','#3B3EAC']

function urlParamsUpdated()
{
    if (urlParams == null)
    {
        return;
    }

    var loc = window.location;
    var url = `${loc.origin}${loc.pathname}?${urlParams.toString()}`
    console.log(url)
    history.replaceState(null, '', url);
}

function parseUrl()
{
    if (!loaded)
    {
        console.log("data not loaded")
        loaded = true;
        return;
    }

    console.log("parsing url")

    var queryString = window.location.search;
    urlParams = new URLSearchParams(queryString);

    if (urlParams.has('mode'))
    {
        mode = urlParams.get('mode');
        console.log("Found mode " + mode)
    }

    if (urlParams.has('club'))
    {
        selectClub(urlParams.get('club'))
        console.log("Found club " + selectedClub)
    }
    
    if (urlParams.has('users'))
    {
        var userIDs = urlParams.get('users').split(',')
        console.log("Found users " + userIDs);
        userIDs.forEach( (userID, index) => selectUser(userID));
    }
}

$(document).ready( function() {
    $('#selectMode').selectize({
        isInputHidden: true
    });
    $('#selectClub').selectize({
        isInputHidden: true
    });
    $('#selectUser').selectize({
        onDropdownOpen: function(dropdown) {
                this.clear(true)
            }
    });

    $.get(apiGetUsers, function ( data ) {
        var select = $('#selectUser')[0].selectize
        $.each(data, function(i, user) {
            users[user.userID] = user;
            select.addOption({value:user.userID, text:user.name})
        });

        parseUrl();
    });
    
    $.get(apiGetClubs, function ( data ) {
        var select = $('#selectClub')[0].selectize
        clubs[0] = {clubID: 0, name: "Norge"}
        $.each(data, function(i, club) {
            clubs[club.clubID] = club;
            select.addOption({value:club.clubID, text:club.name})
        });

        parseUrl();
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

function modeSelected(selector) {
    var newMode = parseInt(selector.options[selector.selectedIndex].value);
    if  (newMode == mode || newMode == NaN)
    {
        return;
    }
    
    mode = newMode;
    dataUpdated();
    urlParams.set("mode", mode);
    urlParamsUpdated();
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
    if  (selectedClub == null)
    {
        return;
    }
    
    var datasets = [];
    for (var key in data)
    {
        var userData = data[key];
        var userValues;
        if (mode == 4) { userValues = userData.map(ud => {return {x: ud.date, y: ud.rankPunches}} ) }
        else if (mode == 3) { userValues = userData.map(ud => {return {x: ud.date, y: ud.rankPoints}}) }
        else if (mode == 2) { userValues = userData.map(ud => {return {x: ud.date, y: ud.punches}}) }
        else { userValues = userData.map(ud => {return {x: moment(ud.date), y: ud.points}}) }

        var dataset = {
                label: users[key].name,
                data : userValues
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
            elements: {
                line: {
                    tension: 0
                }
            },
            responsive: true,
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
                }
            },
            legend: {
                onClick: legendHandler
            }
        }
    });
}