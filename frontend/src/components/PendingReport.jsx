import React, { useState } from "react";
import axios from "axios";

const PendingReport = ({ report, onViewDetails, onReportResolved }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const getReportedUserInfo = () => {
        if (report.filedAgainst) {
            if (report.filedAgainst.facilityName) {
                return report.filedAgainst.facilityName;
            } else {
                return `${report.filedAgainst.firstName} ${report.filedAgainst.lastName}`;
            }
        }
        return "Unknown User";
    };

    const getReporterInfo = () => {
        if (report.filedBy) {
            if (report.filedBy.facilityName) {
                return report.filedBy.facilityName;
            } else {
                return `${report.filedBy.firstName} ${report.filedBy.lastName}`;
            }
        }
        return "Unknown User";
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <div className="card bg-base-200 shadow-sm mb-3">
            <div className="card-body p-4">
                <div className="flex justify-between items-start">
                    <div className="flex-1 cursor-pointer" onClick={() => onViewDetails(report)}>
                        <h3 className="font-semibold text-lg">Report #{report._id?.slice(-6) || 'N/A'}</h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                            <span className="badge badge-warning">Pending</span>
                            <span className="badge badge-outline">
                                Reported: {getReporterInfo()}
                            </span>
                            <span className="badge badge-outline">
                                Against: {getReportedUserInfo()}
                            </span>
                        </div>
                        <p className="text-sm opacity-70 mt-1 line-clamp-2">
                            {report.reason}
                        </p>
                        {report.createdAt && (
                            <p className="text-xs opacity-50 mt-1">
                                Filed: {formatDate(report.createdAt)}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                        <button
                            className="btn btn-info btn-sm"
                            onClick={() => onViewDetails(report)}
                        >
                            View
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="alert alert-error mt-2">
                        <span>{error}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PendingReport;