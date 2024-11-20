$('#admins').DataTable({ responsive: true });
$('#moderators').DataTable({ responsive: true });
$('#users').DataTable({ responsive: true });
$('#history').DataTable({ responsive: true });

async function backup() {
    try {
        var response = await fetch('/api/backup'); // Replace 'YOUR_JSON_URL_HERE' with the actual URL of your JSON data.
        if (!response.ok) {
            throw new Error('Network response was not ok.');
        }
        jsonData = await response.json();
        filename = "backup.json";
        var file = new Blob([JSON.stringify(jsonData)], { type: "application/text" });
        if (window.navigator.msSaveOrOpenBlob) // IE10+
            window.navigator.msSaveOrOpenBlob(file, filename);
        else { // Others
            var a = document.createElement("a"),
                url = URL.createObjectURL(file);
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(function () {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 0);
        }
    } catch (error) {
        console.error('Error fetching JSON data:', error);
    }
}